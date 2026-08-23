-- ROLES
CREATE TYPE public.app_role AS ENUM ('customer','seller','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  address text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SELLERS
CREATE TABLE public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_name text NOT NULL,
  phone text NOT NULL,
  email text,
  location text NOT NULL DEFAULT 'Ruyenzi',
  description text,
  logo_url text,
  cover_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sellers_updated BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "sellers_public_read_approved" ON public.sellers FOR SELECT USING (status = 'approved');
CREATE POLICY "sellers_owner_read" ON public.sellers FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sellers_owner_insert" ON public.sellers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sellers_owner_update" ON public.sellers FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND status = 'pending');
CREATE POLICY "sellers_admin_all" ON public.sellers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.owns_seller(_seller_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sellers WHERE id = _seller_id AND owner_id = auth.uid())
$$;

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (
  is_active AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.status = 'approved')
);
CREATE POLICY "products_seller_read" ON public.products FOR SELECT TO authenticated
  USING (public.owns_seller(seller_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products_seller_write" ON public.products FOR ALL TO authenticated
  USING (public.owns_seller(seller_id)) WITH CHECK (public.owns_seller(seller_id));
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CART
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_own" ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  delivery_address text NOT NULL,
  phone text NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash_on_delivery',
  status text NOT NULL DEFAULT 'placed',
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "orders_customer_read" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR public.owns_seller(seller_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_customer_insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_seller_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.owns_seller(seller_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_seller(seller_id) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.can_see_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (o.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = o.seller_id AND s.owner_id = auth.uid())
        OR public.has_role(auth.uid(),'admin'))
  )
$$;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_read" ON public.order_items FOR SELECT TO authenticated
  USING (public.can_see_order(order_id));
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_own_write" ON public.reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEED
INSERT INTO public.categories (name, slug, icon) VALUES
  ('Electronics','electronics','Smartphone'),
  ('Fashion','fashion','Shirt'),
  ('Beauty','beauty','Sparkles'),
  ('Groceries','groceries','ShoppingBasket'),
  ('Home','home','Sofa'),
  ('School','school','GraduationCap');

INSERT INTO public.sellers (business_name, slug, owner_name, phone, email, location, description, status, logo_url, cover_url) VALUES
  ('Ruyenzi Fashion','ruyenzi-fashion','Mukamana Aline','+250 788 214 556','aline@ruyenzifashion.rw','Ruyenzi Centre','Modern kitenge, casual wear and shoes tailored right here in Ruyenzi.','approved','https://picsum.photos/seed/ruyenzifashion-logo/200/200','https://picsum.photos/seed/ruyenzifashion-cover/1200/400'),
  ('Smart Tech Ruyenzi','smart-tech-ruyenzi','Niyonzima Eric','+250 782 110 907','eric@smarttech.rw','Ruyenzi Market','Phones, accessories and small electronics with fair, honest pricing.','approved','https://picsum.photos/seed/smarttech-logo/200/200','https://picsum.photos/seed/smarttech-cover/1200/400'),
  ('Mama Keza Groceries','mama-keza-groceries','Uwase Claudine','+250 789 445 220','claudine@mamakeza.rw','Ruyenzi Kabeza','Fresh vegetables, rice, beans and daily household basics.','approved','https://picsum.photos/seed/mamakeza-logo/200/200','https://picsum.photos/seed/mamakeza-cover/1200/400'),
  ('Ruyenzi Beauty Store','ruyenzi-beauty-store','Ingabire Diane','+250 783 662 118','diane@ruyenzibeauty.rw','Ruyenzi Centre','Skincare, hair products and beauty essentials for every budget.','approved','https://picsum.photos/seed/ruyenzibeauty-logo/200/200','https://picsum.photos/seed/ruyenzibeauty-cover/1200/400'),
  ('Gasabo Home Supplies','gasabo-home-supplies','Habimana Jean','+250 788 900 341','jean@gasabohome.rw','Ruyenzi Nyarurama','Kitchenware, furniture and home decor made and sourced locally.','approved','https://picsum.photos/seed/gasabohome-logo/200/200','https://picsum.photos/seed/gasabohome-cover/1200/400'),
  ('Isoko School Shop','isoko-school-shop','Mugisha Patrick','+250 787 553 001','patrick@isokoschool.rw','Ruyenzi Centre','Books, uniforms and school materials for primary and secondary students.','approved','https://picsum.photos/seed/isokoschool-logo/200/200','https://picsum.photos/seed/isokoschool-cover/1200/400');

INSERT INTO public.products (seller_id, category_id, title, slug, description, price, stock, images, is_featured)
SELECT s.id, c.id, p.title, p.slug, p.description, p.price, p.stock, ARRAY['https://picsum.photos/seed/' || p.slug || '/800/800','https://picsum.photos/seed/' || p.slug || '-2/800/800'], p.featured
FROM (VALUES
  ('ruyenzi-fashion','fashion','Kitenge Long Dress','kitenge-long-dress','Hand-sewn kitenge dress in vibrant Rwandan prints. Available in all sizes.',18000,12,true),
  ('ruyenzi-fashion','fashion','Men Slim Fit Shirt','men-slim-fit-shirt','Cotton slim fit shirt, perfect for work and church.',12500,20,false),
  ('ruyenzi-fashion','fashion','Leather Sandals','leather-sandals','Locally made leather sandals, durable and comfortable.',9500,15,true),
  ('ruyenzi-fashion','fashion','Kids School Sweater','kids-school-sweater','Warm sweater for school children, machine washable.',7000,30,false),
  ('smart-tech-ruyenzi','electronics','Tecno Spark 20','tecno-spark-20','6.6 inch display, 128GB storage, 5000mAh battery. One year warranty.',185000,6,true),
  ('smart-tech-ruyenzi','electronics','Bluetooth Earbuds','bluetooth-earbuds','Wireless earbuds with charging case and 20h playtime.',22000,25,true),
  ('smart-tech-ruyenzi','electronics','Solar Power Bank 20000mAh','solar-power-bank','Charge your phone anywhere, includes solar panel and torch.',35000,10,false),
  ('smart-tech-ruyenzi','electronics','USB-C Fast Charger','usb-c-fast-charger','25W fast charger with cable included.',8500,40,false),
  ('mama-keza-groceries','groceries','Rice 25kg Bag','rice-25kg-bag','Premium long grain rice, 25kg bag.',32000,18,true),
  ('mama-keza-groceries','groceries','Fresh Tomatoes 1kg','fresh-tomatoes-1kg','Farm fresh tomatoes harvested this morning.',1200,50,false),
  ('mama-keza-groceries','groceries','Cooking Oil 5L','cooking-oil-5l','Pure sunflower cooking oil, 5 litres.',14500,22,false),
  ('mama-keza-groceries','groceries','Beans 5kg','beans-5kg','Local red beans, cleaned and sorted.',7500,35,true),
  ('ruyenzi-beauty-store','beauty','Shea Butter Body Cream','shea-butter-body-cream','Natural shea butter cream for dry skin, 400ml.',6500,28,true),
  ('ruyenzi-beauty-store','beauty','Hair Braiding Set','hair-braiding-set','Complete braiding set with three colours included.',15000,12,false),
  ('ruyenzi-beauty-store','beauty','African Black Soap','african-black-soap','Handmade black soap for clear, healthy skin.',3500,45,false),
  ('gasabo-home-supplies','home','Non-Stick Cooking Pot Set','non-stick-pot-set','Three piece non-stick pot set with glass lids.',45000,8,true),
  ('gasabo-home-supplies','home','Woven Storage Basket','woven-storage-basket','Traditional agaseke-style woven basket for home storage.',11000,16,false),
  ('gasabo-home-supplies','home','LED Desk Lamp','led-desk-lamp','Rechargeable LED lamp, ideal during power cuts.',13500,20,false),
  ('isoko-school-shop','school','Primary School Uniform','primary-school-uniform','Complete uniform set: shirt, shorts and sweater.',16000,25,true),
  ('isoko-school-shop','school','Exercise Books Pack of 10','exercise-books-10','A5 squared exercise books, pack of ten.',4500,60,false),
  ('isoko-school-shop','school','School Backpack','school-backpack','Strong water resistant backpack with two compartments.',18500,14,true),
  ('isoko-school-shop','school','Geometry Set','geometry-set','Complete geometry set in a metal case.',3000,40,false)
) AS p(seller_slug, cat_slug, title, slug, description, price, stock, featured)
JOIN public.sellers s ON s.slug = p.seller_slug
JOIN public.categories c ON c.slug = p.cat_slug;