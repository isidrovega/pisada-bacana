"use strict";

import {
    ensureAnonymousSession
} from "./firebase-session.js";

import {
    PisadaBacanaDB
} from "./database.js";


let unsubscribeOrders = null;


/* =====================================================
   INICIALIZACIÓN
===================================================== */

async function initializeFirebaseData() {

    try {

        await ensureAnonymousSession();

        const migration =
            await PisadaBacanaDB
                .migrateLocalDataOnce();

        if (
            migration.migrated
        ) {

            console.log(
                "Migración a Firestore completada:",
                migration
            );

        }

        /*
            Firestore → espejo local temporal.

            Esto mantiene funcionando Dashboard,
            Clientes, Caja, Reportes y Nota mientras
            terminamos su conversión individual.
        */

        unsubscribeOrders =
            PisadaBacanaDB
                .subscribeOrders(
                    orders => {

                        console.log(
                            `Firestore sincronizado: ${orders.length} pedidos.`
                        );

                    }
                );

        /*
            También sincronizamos Ajustes.
        */

        const settings =
            await PisadaBacanaDB
                .getSettings();

        if (settings) {

            localStorage.setItem(
                "pisadaBacanaSettings",
                JSON.stringify(
                    settings
                )
            );

        }

        document.documentElement
            .classList.add(
                "firestore-ready"
            );

        window.dispatchEvent(
            new CustomEvent(
                "pisadabacana:firestore-ready"
            )
        );

    } catch (error) {

        console.error(
            "Error inicializando Firestore:",
            error
        );

        document.documentElement
            .classList.add(
                "firestore-error"
            );

        window.dispatchEvent(
            new CustomEvent(
                "pisadabacana:firestore-error",
                {
                    detail: {
                        error
                    }
                }
            )
        );

    }

}


/* =====================================================
   LIMPIEZA
===================================================== */

window.addEventListener(
    "pagehide",
    () => {

        if (
            typeof unsubscribeOrders ===
            "function"
        ) {

            unsubscribeOrders();

        }

    }
);


initializeFirebaseData();