"use strict";

import {
    ensureAnonymousSession
} from "./firebase-session.js";

import {
    PisadaBacanaDB
} from "./database.js";


/* =====================================================
   ESTADO GLOBAL
===================================================== */

window.PisadaBacanaData = {
    orders: [],
    settings: null
};


let unsubscribeOrders =
    null;

let unsubscribeSettings =
    null;

let initializationCompleted =
    false;


/* =====================================================
   EVENTOS
===================================================== */

function emitOrdersUpdated(
    orders
) {
    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:orders-updated",
            {
                detail: {
                    orders
                }
            }
        )
    );
}


function emitSettingsUpdated(
    settings
) {
    window.dispatchEvent(
        new CustomEvent(
            "pisadabacana:settings-updated",
            {
                detail: {
                    settings
                }
            }
        )
    );
}


/* =====================================================
   INICIALIZACIÓN
===================================================== */

async function initializeFirestore() {
    try {
        await ensureAnonymousSession();


        /*
            Lectura inicial.
        */

        const [
            orders,
            settings
        ] =
            await Promise.all([
                PisadaBacanaDB
                    .getOrders(),

                PisadaBacanaDB
                    .getSettings()
            ]);


        window.PisadaBacanaData.orders =
            orders;

        window.PisadaBacanaData.settings =
            settings;


        /*
            Tiempo real: pedidos.
        */

        unsubscribeOrders =
            PisadaBacanaDB
                .subscribeOrders(
                    firestoreOrders => {
                        window
                            .PisadaBacanaData
                            .orders =
                            firestoreOrders;

                        emitOrdersUpdated(
                            firestoreOrders
                        );
                    },

                    error => {
                        console.error(
                            "Error en listener de pedidos:",
                            error
                        );
                    }
                );


        /*
            Tiempo real: ajustes.
        */

        unsubscribeSettings =
            PisadaBacanaDB
                .subscribeSettings(
                    firestoreSettings => {
                        window
                            .PisadaBacanaData
                            .settings =
                            firestoreSettings;

                        emitSettingsUpdated(
                            firestoreSettings
                        );
                    },

                    error => {
                        console.error(
                            "Error en listener de ajustes:",
                            error
                        );
                    }
                );


        initializationCompleted =
            true;


        document.documentElement
            .classList.remove(
                "firestore-error"
            );

        document.documentElement
            .classList.add(
                "firestore-ready"
            );


        /*
            Evento principal.

            Los scripts clásicos que estén esperando
            Firebase pueden continuar desde aquí.
        */

        window.dispatchEvent(
            new CustomEvent(
                "pisadabacana:firestore-ready",
                {
                    detail: {
                        orders,
                        settings
                    }
                }
            )
        );


        /*
            Emitimos también los valores iniciales
            a los módulos que usan eventos específicos.
        */

        emitOrdersUpdated(
            orders
        );

        emitSettingsUpdated(
            settings
        );


        console.log(
            `Pisada Bacana conectado a Firestore. ${orders.length} pedidos cargados.`
        );

    } catch (error) {
        initializationCompleted =
            false;

        console.error(
            "No se pudo iniciar Firestore:",
            error
        );


        document.documentElement
            .classList.remove(
                "firestore-ready"
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

function stopSubscriptions() {
    if (
        typeof unsubscribeOrders ===
        "function"
    ) {
        unsubscribeOrders();

        unsubscribeOrders =
            null;
    }


    if (
        typeof unsubscribeSettings ===
        "function"
    ) {
        unsubscribeSettings();

        unsubscribeSettings =
            null;
    }
}


window.addEventListener(
    "pagehide",
    stopSubscriptions
);


/* =====================================================
   API DE ESTADO
===================================================== */

window.PisadaBacanaFirebase = {
    get ready() {
        return initializationCompleted;
    },

    get orders() {
        return (
            window
                .PisadaBacanaData
                ?.orders ||
            []
        );
    },

    get settings() {
        return (
            window
                .PisadaBacanaData
                ?.settings ||
            null
        );
    }
};


/* =====================================================
   INICIO
===================================================== */

initializeFirestore();