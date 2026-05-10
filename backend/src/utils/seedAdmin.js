import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  await connectDB();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = (process.env.ADMIN_EMAIL || 'admin@unipaper.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'change-this-password';

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    console.log(`Admin already exists: ${email}`);
    await mongoose.connection.close();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.create({
    username,
    email,
    password: hashedPassword,
    role: 'super_admin',
    permissions: ['*'],
    status: 'active'
  });

  console.log(`Admin created: ${email}`);
  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error.message);
  mongoose.connection.close()
    .catch(() => undefined)
    .finally(() => process.exit(1));
});
