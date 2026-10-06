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
        "TU_API_KEY",

    authDomain:
        "TU_PROYECTO.firebaseapp.com",

    projectId:
        "TU_PROJECT_ID",

    storageBucket:
        "TU_PROYECTO.firebasestorage.app",

    messagingSenderId:
        "TU_MESSAGING_SENDER_ID",

    appId:
        "TU_APP_ID"

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