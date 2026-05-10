import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Folder } from '../models/Folder.js';

dotenv.config();

const categoryNames = ['Notes', 'Assignments', 'PYQ', 'Syllabus'];
const defaultSubjects = [
  'DBMS',
  'Data Structures',
  'Operating System',
  'Computer Networks'
];

const findOrCreateFolder = async ({ name, type, parent = null, path }) => {
  const existing = await Folder.findOne({ name, parent });

  if (existing) {
    return existing;
  }

  return Folder.create({
    name,
    type,
    parent,
    path
  });
};

const seedFolders = async () => {
  await connectDB();

  const course = await findOrCreateFolder({
    name: 'B.Tech',
    type: 'course',
    path: 'B.Tech'
  });

  for (let semesterNumber = 1; semesterNumber <= 8; semesterNumber += 1) {
    const semesterName = `Semester ${semesterNumber}`;
    const semester = await findOrCreateFolder({
      name: semesterName,
      type: 'semester',
      parent: course._id,
      path: `${course.path}/${semesterName}`
    });

    for (const subjectName of defaultSubjects) {
      const subject = await findOrCreateFolder({
        name: subjectName,
        type: 'subject',
        parent: semester._id,
        path: `${semester.path}/${subjectName}`
      });

      for (const categoryName of categoryNames) {
        await findOrCreateFolder({
          name: categoryName,
          type: 'category',
          parent: subject._id,
          path: `${subject.path}/${categoryName}`
        });
      }
    }
  }

  console.log('Default B.Tech folder tree seeded.');
  process.exit(0);
};

seedFolders().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
