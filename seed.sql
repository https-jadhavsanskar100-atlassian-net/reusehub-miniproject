INSERT INTO categories(name,slug,description) VALUES('Books & Notes','books-notes','Textbooks, reference books and study notes') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Electronics','electronics','Laptops, headphones and electronics') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Calculators','calculators','Scientific and engineering calculators') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Sports','sports','Sports gear and fitness equipment') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Hostel Essentials','hostel-essentials','Useful items for student accommodation') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Stationery','stationery','Stationery, art and desk supplies') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Cycles & Travel','cycles-travel','Bicycles and everyday travel items') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Lab Equipment','lab-equipment','Permitted educational and lab equipment') ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name,slug,description) VALUES('Other','other','Other permitted student items') ON CONFLICT(slug) DO NOTHING;