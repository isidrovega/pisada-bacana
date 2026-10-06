"use strict";


import {
    auth
}
from "./firebase-config.js";


import {
    onAuthStateChanged,
    signInAnonymously
}
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


/* =====================================================
   ESTADO
===================================================== */

let sessionPromise = null;


/* =====================================================
   ESPERAR ESTADO INICIAL DE FIREBASE AUTH
===================================================== */

function waitForInitialAuthState() {

    return new Promise(
        resolve => {

            const unsubscribe =
                onAuthStateChanged(
                    auth,
                    user => {

                        unsubscribe();

                        resolve(user);

                    },
                    error => {

                        unsubscribe();

                        console.error(
                            "Error verificando sesión:",
                            error
                        );

                        resolve(null);

                    }
                );

        }
    );

}


/* =====================================================
   ASEGURAR SESIÓN ANÓNIMA
===================================================== */

async function ensureAnonymousSession() {

    /*
        Evita ejecutar varios inicios de sesión
        simultáneamente desde diferentes funciones.
    */

    if (sessionPromise) {

        return sessionPromise;

    }


    sessionPromise =
        (async () => {

            try {

                /*
                    Primero esperamos a que Firebase
                    restaure una sesión existente.
                */

                const existingUser =
                    await waitForInitialAuthState();


                if (existingUser) {

                    console.log(
                        "Firebase conectado."
                    );


                    console.log(
                        "UID:",
                        existingUser.uid
                    );


                    return existingUser;

                }


                /*
                    No existe sesión:
                    creamos una automáticamente.
                */

                const credential =
                    await signInAnonymously(
                        auth
                    );


                console.log(
                    "Sesión anónima creada."
                );


                console.log(
                    "UID:",
                    credential.user.uid
                );


                return credential.user;

            } catch (error) {

                /*
                    Permitimos reintentar si hubo
                    algún problema de red/configuración.
                */

                sessionPromise = null;


                console.error(
                    "No se pudo iniciar Firebase:",
                    error
                );


                throw error;

            }

        })();


    return sessionPromise;

}


/* =====================================================
   OBTENER USUARIO
===================================================== */

async function getCurrentFirebaseUser() {

    return ensureAnonymousSession();

}


/* =====================================================
   INICIALIZACIÓN AUTOMÁTICA
===================================================== */

try {

    await ensureAnonymousSession();


    document.documentElement
        .classList.add(
            "firebase-ready"
        );


    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:firebase-ready",
            {
                detail: {
                    uid:
                        auth.currentUser
                            ?.uid || null
                }
            }
        )
    );

} catch (error) {

    document.documentElement
        .classList.add(
            "firebase-error"
        );


    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:firebase-error",
            {
                detail: {
                    error
                }
            }
        )
    );

}


/* =====================================================
   EXPORTAR
===================================================== */

export {
    ensureAnonymousSession,
    getCurrentFirebaseUser
};