"use strict";


/* =====================================================
   FIREBASE
===================================================== */

import {
    initializeApp
}
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";


import {
    getFirestore
}
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


import {
    getAuth,
    setPersistence,
    browserLocalPersistence
}
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const firebaseConfig = {

    apiKey:
        "AIzaSyA0ARDphAawD3S3YDIGgwzkJfmDXnAUdH4",

    authDomain:
        "pisada-bacana.firebaseapp.com",

    projectId:
        "pisada-bacana",

    storageBucket:
        "pisada-bacana.firebasestorage.app",

    messagingSenderId:
        "240758534281",

    appId:
        "1:240758534281:web:f49941d475578bfcdc5658"

};


/* =====================================================
   INICIALIZAR FIREBASE
===================================================== */

const app =
    initializeApp(
        firebaseConfig
    );


const db =
    getFirestore(app);


const auth =
    getAuth(app);


/* =====================================================
   PERSISTENCIA
===================================================== */

await setPersistence(
    auth,
    browserLocalPersistence
);


/* =====================================================
   EXPORTAR
===================================================== */

export {
    app,
    db,
    auth
};