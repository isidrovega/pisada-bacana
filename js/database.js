"use strict";


import {
    db
}
from "./firebase-config.js";


import {
    ensureAnonymousSession
}
from "./firebase-session.js";


import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


/* =====================================================
   UTILIDADES
===================================================== */

async function ensureDatabaseReady() {

    await ensureAnonymousSession();

}


/* =====================================================
   OBTENER COLECCIÓN
===================================================== */

async function getCollectionData(
    collectionName
) {

    await ensureDatabaseReady();


    const collectionReference =
        collection(
            db,
            collectionName
        );


    const snapshot =
        await getDocs(
            collectionReference
        );


    return snapshot.docs.map(
        documentSnapshot => ({
            id:
                documentSnapshot.id,

            ...documentSnapshot.data()
        })
    );

}


/* =====================================================
   OBTENER COLECCIÓN ORDENADA
===================================================== */

async function getOrderedCollection(
    collectionName,
    fieldName,
    direction = "desc"
) {

    await ensureDatabaseReady();


    const collectionReference =
        collection(
            db,
            collectionName
        );


    const collectionQuery =
        query(
            collectionReference,
            orderBy(
                fieldName,
                direction
            )
        );


    const snapshot =
        await getDocs(
            collectionQuery
        );


    return snapshot.docs.map(
        documentSnapshot => ({
            id:
                documentSnapshot.id,

            ...documentSnapshot.data()
        })
    );

}


/* =====================================================
   OBTENER DOCUMENTO
===================================================== */

async function getDocument(
    collectionName,
    documentId
) {

    await ensureDatabaseReady();


    const documentReference =
        doc(
            db,
            collectionName,
            documentId
        );


    const snapshot =
        await getDoc(
            documentReference
        );


    if (!snapshot.exists()) {

        return null;

    }


    return {
        id:
            snapshot.id,

        ...snapshot.data()
    };

}


/* =====================================================
   CREAR DOCUMENTO AUTOMÁTICO
===================================================== */

async function createDocument(
    collectionName,
    data
) {

    await ensureDatabaseReady();


    const reference =
        await addDoc(
            collection(
                db,
                collectionName
            ),
            {
                ...data,

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()
            }
        );


    return reference.id;

}


/* =====================================================
   CREAR DOCUMENTO CON ID
===================================================== */

async function setDocument(
    collectionName,
    documentId,
    data,
    merge = true
) {

    await ensureDatabaseReady();


    const reference =
        doc(
            db,
            collectionName,
            documentId
        );


    await setDoc(
        reference,
        {
            ...data,

            updatedAt:
                serverTimestamp()
        },
        {
            merge
        }
    );


    return documentId;

}


/* =====================================================
   ACTUALIZAR DOCUMENTO
===================================================== */

async function updateDocument(
    collectionName,
    documentId,
    data
) {

    await ensureDatabaseReady();


    const reference =
        doc(
            db,
            collectionName,
            documentId
        );


    await updateDoc(
        reference,
        {
            ...data,

            updatedAt:
                serverTimestamp()
        }
    );

}


/* =====================================================
   ELIMINAR DOCUMENTO
===================================================== */

async function removeDocument(
    collectionName,
    documentId
) {

    await ensureDatabaseReady();


    await deleteDoc(
        doc(
            db,
            collectionName,
            documentId
        )
    );

}


/* =====================================================
   API PISADA BACANA
===================================================== */

const PisadaBacanaDB = {

    getCollection:
        getCollectionData,

    getOrderedCollection,

    getDocument,

    createDocument,

    setDocument,

    updateDocument,

    deleteDocument:
        removeDocument

};


export {
    PisadaBacanaDB
};