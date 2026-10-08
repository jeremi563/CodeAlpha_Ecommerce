import prisma from "./prisma.js";

try {
    await prisma.$connect();
    console.log("Database connected successfully");
    
    await prisma.$disconnect();
}
 catch (error) {
    console.error("Database connection failed",error);
    process.exit(1);
 }