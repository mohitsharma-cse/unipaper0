import { Folder } from '../models/Folder.js';
import { MaterialFile } from '../models/MaterialFile.js';

export const buildFolderTree = (folders) => {
  const folderMap = new Map();
  const roots = [];

  folders.forEach((folder) => {
    const plain = folder.toObject ? folder.toObject() : folder;
    folderMap.set(String(plain._id), {
      ...plain,
      children: []
    });
  });

  folderMap.forEach((folder) => {
    const parentId = folder.parent ? String(folder.parent) : null;

    if (parentId && folderMap.has(parentId)) {
      folderMap.get(parentId).children.push(folder);
    } else {
      roots.push(folder);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
};

export const getDescendantFolderIds = async (folderId) => {
  const ids = [folderId];
  const queue = [folderId];

  while (queue.length) {
    const current = queue.shift();
    const children = await Folder.find({ parent: current }).select('_id');
    children.forEach((child) => {
      ids.push(child._id);
      queue.push(child._id);
    });
  }

  return ids;
};

export const refreshDescendantPaths = async (parentFolder) => {
  const children = await Folder.find({ parent: parentFolder._id });

  await Promise.all(children.map(async (child) => {
    child.path = `${parentFolder.path}/${child.name}`;
    await child.save();

    // Update metadata for files in this specific folder
    const updates = {};
    if (child.type === 'course') updates.course = child.name;
    if (child.type === 'semester') updates.semester = child.name;
    if (child.type === 'subject') updates.subject = child.name;
    if (child.type === 'category') updates.category = child.name;

    if (Object.keys(updates).length > 0) {
      await MaterialFile.updateMany({ folderId: child._id }, { $set: updates });
    }

    await refreshDescendantPaths(child);
  }));
};
