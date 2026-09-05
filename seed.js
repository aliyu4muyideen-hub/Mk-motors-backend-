// Run once with: npm run seed
// Populates the database with sample vehicles to start with.
// Safe to re-run — it clears existing vehicles first.

const db = require("./db");

const VEHICLES = [
  { id: "v1", year: 2022, make: "Toyota", model: "Camry", trim: "SE", bodyType: "Sedan", price: 22900, mileage: 48200, engine: "2.5L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Midnight Blue", interiorColor: "Charcoal Cloth", description: "A well-kept Camry SE with a clean service history and no reported accidents." },
  { id: "v2", year: 2021, make: "Honda", model: "CR-V", trim: "EX", bodyType: "SUV", price: 24500, mileage: 52400, engine: "1.5L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Silver", interiorColor: "Black Cloth", description: "Spacious and dependable, with all-wheel drive and a full inspection report on file." },
  { id: "v3", year: 2023, make: "Hyundai", model: "Elantra", trim: "SEL", bodyType: "Sedan", price: 19900, mileage: 31800, engine: "2.0L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Pearl White", interiorColor: "Gray Cloth", description: "Low mileage and still under factory warranty." },
  { id: "v4", year: 2022, make: "Toyota", model: "RAV4", trim: "LE", bodyType: "SUV", price: 25700, mileage: 40600, engine: "2.5L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Magnetic Gray", interiorColor: "Black Fabric", description: "One-owner RAV4 with a clean title and up-to-date maintenance records." },
  { id: "v5", year: 2020, make: "Honda", model: "Accord", trim: "LX", bodyType: "Sedan", price: 20400, mileage: 61200, engine: "1.5L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Modern Steel", interiorColor: "Black Cloth", description: "A reliable Accord priced to move, inspected and reconditioned before listing." },
  { id: "v6", year: 2021, make: "Ford", model: "Explorer", trim: "XLT", bodyType: "SUV", price: 27900, mileage: 55700, engine: "2.3L Turbo 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Agate Black", interiorColor: "Ebony Cloth", description: "Three-row seating and a recent brake service." },
  { id: "v7", year: 2023, make: "Kia", model: "Forte", trim: "LXS", bodyType: "Sedan", price: 18600, mileage: 21300, engine: "2.0L 4-Cyl", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Snow White Pearl", interiorColor: "Black Cloth", description: "Nearly new with remaining factory coverage." },
  { id: "v8", year: 2019, make: "Ford", model: "F-150", trim: "XLT", bodyType: "Truck", price: 26300, mileage: 67500, engine: "3.3L V6", transmission: "Automatic", fuelType: "Gasoline", exteriorColor: "Oxford White", interiorColor: "Medium Earth Gray", description: "A capable work truck with a bed liner and tow package already installed." },
  { id: "v9", year: 2022, make: "Honda", model: "Civic", trim: "Sport", bodyType: "Hatchback", price: 21200, mileage: 29800, engine: "2.0L 4-Cyl", transmission: "Manual", fuelType: "Gasoline", exteriorColor: "Rallye Red", interiorColor: "Black Cloth", description: "A fun-to-drive Civic Sport with a manual transmission." },
];

const clearImages = db.prepare("DELETE FROM vehicle_images");
const clearVehicles = db.prepare("DELETE FROM vehicles");
const insertVehicle = db.prepare(`
  INSERT INTO vehicles (id, year, make, model, trim, bodyType, price, mileage, engine, transmission, fuelType, exteriorColor, interiorColor, description)
  VALUES (@id, @year, @make, @model, @trim, @bodyType, @price, @mileage, @engine, @transmission, @fuelType, @exteriorColor, @interiorColor, @description)
`);

db.transaction(() => {
  clearImages.run();
  clearVehicles.run();
  VEHICLES.forEach((v) => insertVehicle.run(v));
})();

console.log(`Seeded ${VEHICLES.length} vehicles.`);
