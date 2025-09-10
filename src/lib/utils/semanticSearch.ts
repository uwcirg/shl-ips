// src/lib/utils/semanticSearch.ts

const EMBEDDINGS_DB_NAME = 'fhir-embeddings';
const EMBEDDINGS_STORE_NAME = 'embeddings';

export async function initializeEmbeddingsDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(EMBEDDINGS_DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(EMBEDDINGS_STORE_NAME)) {
                db.createObjectStore(EMBEDDINGS_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export async function checkEmbeddingsExist(): Promise<boolean> {
    const db = await initializeEmbeddingsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(EMBEDDINGS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EMBEDDINGS_STORE_NAME);
        const request = store.count();
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => reject(request.error);
    });
}

export async function createEmbedding(textSource: string): Promise<number[]> {
    //const response = await fetch('https://api.openai.com/v1/embeddings', {
    //const response = await fetch('https://llm-service.ubu.mcjustin.wvp.dev.cirg.uw.edu/api/embedding', {
    const response = await fetch('https://llm-service.ubu.mcjustin.dev.cirg.uw.edu/api/embedding', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages: textSource
        })
    });
    const data = await response.json();
    return data.embedding;
}

export async function clearEmbeddings() {
    const db = await initializeEmbeddingsDB();
    const transaction = db.transaction(EMBEDDINGS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EMBEDDINGS_STORE_NAME);
    return new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
    });
}

export async function storeEmbedding(id: string, embedding: number[], resource: any) {
    const db = await initializeEmbeddingsDB();
    const transaction = db.transaction(EMBEDDINGS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EMBEDDINGS_STORE_NAME);
    return new Promise<void>((resolve, reject) => {
        const request = store.put({ id, embedding, resource });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getAllEmbeddings() {
    const db = await initializeEmbeddingsDB();
    const transaction = db.transaction(EMBEDDINGS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(EMBEDDINGS_STORE_NAME);
    return new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
