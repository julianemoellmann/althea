let connection;
function database() {
  return connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('althea-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(request.error); };
  });
}
export async function saveProject(project) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').put(project);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('The browser could not save this project.'));
  });
}
export async function deleteProject(id) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('The browser could not delete this project.'));
  });
}
export async function deleteAllProjects() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('The browser could not delete the saved projects.'));
  });
}
export async function allProjects() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('projects').objectStore('projects').getAll();
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}
// System check: writes and removes a record in one transaction, so it never shows up as a project.
export async function storageWorks() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite'), store = transaction.objectStore('projects');
    store.put({ id: '__checkup__', updatedAt: '' }); store.delete('__checkup__');
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('The browser refused to save data.'));
  });
}
