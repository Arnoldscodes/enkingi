# Inkingi: Your Ruyenzi Marketplace

eNkingi MVP 

Project Overview

Build a modern multi-vendor e-commerce web application called INKINGI.

This is Version 1 (Pilot) and it operates only in Ruyenzi neighborhood, Kigali, Rwanda. The platform is designed to validate the business before expanding to the rest of Kigali and later Rwanda.

The mission is to help residents discover fair prices from trusted local sellers while helping small businesses in Ruyenzi sell online.

Technology Stack

Use:

Next.js

React

TypeScript

Tailwind CSS

Supabase

PostgreSQL

Supabase Authentication

Supabase Storage

The project must be responsive on phones and desktop.

Brand Identity

Name: eNkingi

Meaning: The pillar that holds everything together.

Design style:

Premium

Minimal

Trustworthy

Green (#0F6A3B)

White background

Charcoal text

Rounded modern cards

Clean spacing

Currency: RWF

Language: English interface with the ability to support Kinyarwanda later.

Pilot Scope

The marketplace serves only:

Customers living in Ruyenzi

Verified sellers located in Ruyenzi

Delivery inside Ruyenzi

Do not build nationwide logistics.

User Roles

Customer

Customer can:

Create account

Login

Browse products

Search products

Filter categories

Add to cart

Checkout

Track order

View order history

Edit profile

Customer profile:

Name

Phone number

Address

Email

Profile picture

Seller

Every seller has their own storefront.

Seller registration includes:

Business name

Owner name

Phone

Email

Ruyenzi location

Business description

Logo

Cover image

Seller dashboard includes:

Dashboard

Total orders

Revenue

Products

Pending orders

Products

Seller can:

Upload multiple images

Product title

Description

Price

Stock quantity

Category

Edit/Delete products

Orders

Seller can:

Accept

Reject

Mark preparing

Mark ready

Admin

Admin approves sellers before they become visible.

Admin manages:

Sellers

Products

Categories

Orders

Customers

Homepage

Hero section:

Fair Prices From Your Neighborhood

Subtitle:

Discover trusted businesses in Ruyenzi and shop with confidence.

Buttons:

Shop Now

Become a Seller

Below:

Search bar

Categories:

Electronics

Fashion

Beauty

Groceries

Home

School

Featured products

Featured local businesses

Why Inkingi

Three cards:

Fair Pricing

Trusted Sellers

Fast Local Delivery

Product Page

Display:

Images

Title

Seller name

Verified badge

Price

Stock

Description

Button:

Add to Cart

Show:

Related products from nearby sellers.

Checkout

Collect:

Delivery address

Phone number

Payment method

Payment methods (placeholder):

Mobile Money

Cash on Delivery

Generate order number.

Order Tracking

Simple timeline:

Order placed

Seller accepted

Preparing

Out for delivery

Delivered

Database

Create tables:

users

sellers

products

categories

orders

order_items

cart

reviews

Use Supabase Auth with roles:

customer

seller

admin

Sample Data

Generate realistic businesses from Ruyenzi.

Examples:

Ruyenzi Fashion

Smart Tech Ruyenzi

Mama Keza Groceries

Ruyenzi Beauty Store

Use realistic Rwandan names and prices.

Important Business Rules

Only verified sellers appear publicly.

Every seller owns only their products.

Customers cannot edit seller products.

Admin verifies new sellers.

Products display the seller's business name.

Delivery is limited to Ruyenzi for the pilot.

Future Expansion (Do Not Build Yet)

Prepare architecture only.

Future modules:

Kigali expansion

Supplier portal

Delivery rider app

Affiliate program

AI recommendations

Mobile application

Keep the code scalable so these can be added later.

One strategic change I'd make

I would remove price comparison from V1.

I know that's your dream feature, but here's why:

To compare prices accurately, you need many sellers listing the same product. On day one in Ruyenzi, you probably won't have enough data.

Instead, build this first:

Trusted Local Marketplace

Once you have 30–50 sellers and hundreds of products, then introduce Fair Price Comparison as V2. It'll be based on real data instead of fake estimates.

MVP Success Goal

Your pilot is successful if, within Ruyenzi, you achieve:

10 verified sellers

100 products

50 registered customers

25 completed orders

Customers successfully tracking deliveries

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://enkingi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/646c987c-f158-4d5d-bf40-6fd4948462b3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
