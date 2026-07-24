CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  delivery_type text NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  extras jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO service_role;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Anyone can view categories"
ON public.menu_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage categories"
ON public.menu_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view menu items"
ON public.menu_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage menu items"
ON public.menu_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can place orders"
ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view and update orders"
ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can add order items"
ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view order items"
ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.menu_categories (name, sort_order) VALUES
  ('Hambúrgueres', 1),
  ('Porções', 2),
  ('Bebidas', 3);

INSERT INTO public.menu_items (category_id, name, description, price, image_url, sort_order) VALUES
  ((SELECT id FROM public.menu_categories WHERE name = 'Hambúrgueres'), 'Classic Burger', 'Pão brioche, carne 180g, queijo cheddar, alface, tomate e molho especial.', 28.90, 'https://images.unsplash.com/photo-1568901346375-53c94fbac75e?w=600&auto=format&fit=crop', 1),
  ((SELECT id FROM public.menu_categories WHERE name = 'Hambúrgueres'), 'Bacon Burger', 'Pão brioche, carne 180g, queijo, bacon crocante, cebola caramelizada e molho barbecue.', 34.90, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&auto=format&fit=crop', 2),
  ((SELECT id FROM public.menu_categories WHERE name = 'Porções'), 'Batata Frita', 'Porção de batatas fritas crocantes com sal e orégano.', 18.90, 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&auto=format&fit=crop', 1),
  ((SELECT id FROM public.menu_categories WHERE name = 'Porções'), 'Onion Rings', 'Anéis de cebola empanados e fritos, servidos com molho ranch.', 22.90, 'https://images.unsplash.com/photo-1639024471283-035188835e40?w=600&auto=format&fit=crop', 2),
  ((SELECT id FROM public.menu_categories WHERE name = 'Bebidas'), 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite 350ml.', 6.90, 'https://images.unsplash.com/photo-1622483767028-3f66f248a670?w=600&auto=format&fit=crop', 1),
  ((SELECT id FROM public.menu_categories WHERE name = 'Bebidas'), 'Suco Natural', 'Suco de laranja, limão ou maracujá 400ml.', 12.90, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop', 2);