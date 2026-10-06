"use strict";

import {
    db
} from "./firebase-config.js";

import {
    ensureAnonymousSession
} from "./firebase-session.js";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    setDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const ORDERS_COLLECTION = "orders";
const SETTINGS_COLLECTION = "settings";
const SYSTEM_COLLECTION = "system";

const BUSINESS_SETTINGS_ID = "business";
const COUNTER_ID = "orderCounter";

const LOCAL_ORDERS_KEY = "pisadaBacanaOrders";
const LOCAL_SETTINGS_KEY = "pisadaBacanaSettings";

const MIGRATION_KEY =
    "pisadaBacanaFirestoreMigrationV1";


/* =====================================================
   UTILIDADES
===================================================== */

function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

}


function createId(prefix = "id") {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
            "function"
    ) {

        return `${prefix}-${window.crypto.randomUUID()}`;

    }

    return (
        `${prefix}-${Date.now()}-` +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );

}


function toISO(value) {

    if (!value) {
        return null;
    }

    /*
        Firestore Timestamp.
    */

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value
            .toDate()
            .toISOString();

    }

    /*
        Firebase Timestamp serializado.
    */

    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        return new Date(
            value.seconds * 1000
        ).toISOString();

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date.toISOString();

}


function sanitizeForFirestore(value) {

    if (Array.isArray(value)) {

        return value
            .map(sanitizeForFirestore);

    }

    if (
        value &&
        typeof value === "object"
    ) {

        const result = {};

        Object.entries(value)
            .forEach(
                ([key, child]) => {

                    if (
                        child === undefined
                    ) {
                        return;
                    }

                    result[key] =
                        sanitizeForFirestore(
                            child
                        );

                }
            );

        return result;

    }

    return value;

}


/* =====================================================
   NORMALIZAR PAGOS
===================================================== */

function normalizePayments(order) {

    const payments =
        Array.isArray(order.payments)
            ? clone(order.payments)
            : [];

    const advance =
        Math.max(
            Number(
                order.advance || 0
            ),
            0
        );

    /*
        Hay dos formatos históricos:

        A)
        advance contiene TODO lo pagado y
        payments contiene solamente pagos posteriores.

        B)
        advance contiene TODO lo pagado y
        payments ya contiene también el anticipo.

        No debemos sumar advance + payments.
    */

    let paymentTotal =
        payments.reduce(
            (sum, payment) =>
                sum +
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                ),
            0
        );

    if (
        advance > 0 &&
        paymentTotal < advance
    ) {

        const missing =
            advance - paymentTotal;

        payments.unshift({
            id:
                createId("payment"),

            amount:
                missing,

            method:
                order.paymentMethod ||
                "Efectivo",

            type:
                "Anticipo",

            date:
                order.createdAt ||
                new Date()
                    .toISOString()
        });

        paymentTotal += missing;

    }

    /*
        Si un formato antiguo produce payments > advance,
        payments es la fuente más detallada.
    */

    const paid =
        Math.max(
            advance,
            paymentTotal
        );

    return {
        payments,
        paid
    };

}


/* =====================================================
   NORMALIZAR PEDIDO
===================================================== */

function normalizeOrder(
    source,
    fallbackId = null
) {

    const order =
        clone(source || {});

    const id =
        String(
            order.id ||
            fallbackId ||
            createId("order")
        );

    const items =
        Array.isArray(order.items) &&
        order.items.length > 0
            ? order.items.map(
                item => ({
                    id:
                        item.id ||
                        createId("item"),

                    itemType:
                        item.itemType ===
                        "Gorra"
                            ? "Gorra"
                            : "Tenis",

                    brand:
                        String(
                            item.brand || ""
                        ),

                    model:
                        String(
                            item.model || ""
                        ),

                    color:
                        String(
                            item.color || ""
                        ),

                    service:
                        String(
                            item.service || ""
                        ),

                    price:
                        Math.max(
                            Number(
                                item.price || 0
                            ),
                            0
                        )
                })
            )
            : [{
                id:
                    createId("item"),

                itemType:
                    order.itemType ===
                    "Gorra"
                        ? "Gorra"
                        : "Tenis",

                brand:
                    String(
                        order.brand || ""
                    ),

                model:
                    String(
                        order.model || ""
                    ),

                color:
                    String(
                        order.color || ""
                    ),

                service:
                    String(
                        order.service || ""
                    ),

                price:
                    Math.max(
                        Number(
                            order.price || 0
                        ),
                        0
                    )
            }];

    const itemTotal =
        items.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.price || 0
                ),
            0
        );

    const price =
        itemTotal > 0
            ? itemTotal
            : Math.max(
                Number(
                    order.price || 0
                ),
                0
            );

    const {
        payments,
        paid
    } =
        normalizePayments(order);

    const balance =
        Math.max(
            price - paid,
            0
        );

    const createdAt =
        toISO(
            order.createdAt
        ) ||
        new Date()
            .toISOString();

    const updatedAt =
        toISO(
            order.updatedAt
        ) ||
        createdAt;

    const deliveredAt =
        toISO(
            order.deliveredAt
        );

    const normalized = {

        ...order,

        id,

        code:
            String(
                order.code || ""
            ),

        clientName:
            String(
                order.clientName || ""
            ),

        phone:
            String(
                order.phone || ""
            ),

        items,

        price,

        paid,

        /*
            Compatibilidad temporal con los módulos
            existentes.

            advance representa "total pagado".
        */
        advance:
            paid,

        balance,

        payments,

        paymentMethod:
            String(
                order.paymentMethod ||
                payments[0]?.method ||
                "Efectivo"
            ),

        status:
            String(
                order.status ||
                "Recibido"
            ),

        deliveryDate:
            String(
                order.deliveryDate || ""
            ),

        notes:
            String(
                order.notes || ""
            ),

        createdAt,

        updatedAt

    };

    if (deliveredAt) {
        normalized.deliveredAt =
            deliveredAt;
    } else {
        delete normalized.deliveredAt;
    }

    /*
        Compatibilidad con las pantallas antiguas.
    */

    const firstItem =
        items[0];

    normalized.itemType =
        firstItem?.itemType || "Tenis";

    normalized.brand =
        firstItem?.brand || "";

    normalized.model =
        firstItem?.model || "";

    normalized.color =
        firstItem?.color || "";

    normalized.service =
        items.length === 1
            ? (
                firstItem?.service ||
                ""
            )
            : `${items.length} artículos`;

    return normalized;

}


/* =====================================================
   CACHE LOCAL TEMPORAL
===================================================== */

function cacheOrders(orders) {

    localStorage.setItem(
        LOCAL_ORDERS_KEY,
        JSON.stringify(
            orders
        )
    );

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


function cacheSettings(settings) {

    if (!settings) {
        return;
    }

    localStorage.setItem(
        LOCAL_SETTINGS_KEY,
        JSON.stringify(
            settings
        )
    );

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
   PEDIDOS
===================================================== */

async function getOrders() {

    await ensureAnonymousSession();

    const ordersQuery =
        query(
            collection(
                db,
                ORDERS_COLLECTION
            ),
            orderBy(
                "createdAt",
                "desc"
            )
        );

    const snapshot =
        await getDocs(
            ordersQuery
        );

    const orders =
        snapshot.docs.map(
            snapshotDocument =>
                normalizeOrder(
                    snapshotDocument.data(),
                    snapshotDocument.id
                )
        );

    cacheOrders(orders);

    return orders;

}


async function getOrder(orderId) {

    await ensureAnonymousSession();

    const reference =
        doc(
            db,
            ORDERS_COLLECTION,
            orderId
        );

    const snapshot =
        await getDoc(
            reference
        );

    if (!snapshot.exists()) {
        return null;
    }

    return normalizeOrder(
        snapshot.data(),
        snapshot.id
    );

}


async function saveOrder(order) {

    await ensureAnonymousSession();

    const normalized =
        normalizeOrder(order);

    normalized.updatedAt =
        new Date()
            .toISOString();

    await setDoc(
        doc(
            db,
            ORDERS_COLLECTION,
            normalized.id
        ),
        sanitizeForFirestore(
            normalized
        ),
        {
            merge: true
        }
    );

    return normalized;

}


async function deleteOrder(orderId) {

    await ensureAnonymousSession();

    await deleteDoc(
        doc(
            db,
            ORDERS_COLLECTION,
            orderId
        )
    );

}


/* =====================================================
   FOLIO ATÓMICO
===================================================== */

function getCodeNumber(code) {

    const match =
        String(code || "")
            .match(
                /(\d+)$/
            );

    return match
        ? Number(match[1])
        : 0;

}


async function getHighestExistingFolio() {

    const snapshot =
        await getDocs(
            collection(
                db,
                ORDERS_COLLECTION
            )
        );

    return snapshot.docs.reduce(
        (highest, item) => {

            return Math.max(
                highest,
                getCodeNumber(
                    item.data()?.code
                )
            );

        },
        0
    );

}


async function getNextOrderCode(
    prefix = "PB"
) {

    await ensureAnonymousSession();

    const normalizedPrefix =
        String(
            prefix || "PB"
        )
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            ) || "PB";

    const counterReference =
        doc(
            db,
            SYSTEM_COLLECTION,
            COUNTER_ID
        );

    const highestExisting =
        await getHighestExistingFolio();

    const nextNumber =
        await runTransaction(
            db,
            async transaction => {

                const snapshot =
                    await transaction.get(
                        counterReference
                    );

                const current =
                    snapshot.exists()
                        ? Math.max(
                            Number(
                                snapshot.data()
                                    .value || 0
                            ),
                            highestExisting
                        )
                        : highestExisting;

                const next =
                    current + 1;

                transaction.set(
                    counterReference,
                    {
                        value:
                            next,

                        prefix:
                            normalizedPrefix,

                        updatedAt:
                            new Date()
                                .toISOString()
                    },
                    {
                        merge: true
                    }
                );

                return next;

            }
        );

    return (
        `${normalizedPrefix}-` +
        String(nextNumber)
            .padStart(
                4,
                "0"
            )
    );

}


/* =====================================================
   CONFIGURACIÓN
===================================================== */

async function getSettings() {

    await ensureAnonymousSession();

    const reference =
        doc(
            db,
            SETTINGS_COLLECTION,
            BUSINESS_SETTINGS_ID
        );

    const snapshot =
        await getDoc(
            reference
        );

    if (!snapshot.exists()) {

        const local =
            localStorage.getItem(
                LOCAL_SETTINGS_KEY
            );

        if (!local) {
            return null;
        }

        try {
            return JSON.parse(local);
        } catch {
            return null;
        }

    }

    const settings =
        snapshot.data();

    cacheSettings(settings);

    return settings;

}


async function saveSettings(settings) {

    await ensureAnonymousSession();

    const clean =
        sanitizeForFirestore(
            settings
        );

    await setDoc(
        doc(
            db,
            SETTINGS_COLLECTION,
            BUSINESS_SETTINGS_ID
        ),
        {
            ...clean,

            updatedAt:
                new Date()
                    .toISOString()
        },
        {
            merge: false
        }
    );

    cacheSettings(clean);

    return clean;

}


/* =====================================================
   MIGRACIÓN LOCAL → FIRESTORE
===================================================== */

function readLocalOrders() {

    try {

        const stored =
            localStorage.getItem(
                LOCAL_ORDERS_KEY
            );

        if (!stored) {
            return [];
        }

        const parsed =
            JSON.parse(stored);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "No se pudo leer el respaldo local:",
            error
        );

        return [];

    }

}


function readLocalSettings() {

    try {

        const stored =
            localStorage.getItem(
                LOCAL_SETTINGS_KEY
            );

        return stored
            ? JSON.parse(stored)
            : null;

    } catch (error) {

        console.error(
            "No se pudo leer la configuración local:",
            error
        );

        return null;

    }

}


async function migrateLocalDataOnce() {

    await ensureAnonymousSession();

    if (
        localStorage.getItem(
            MIGRATION_KEY
        ) === "complete"
    ) {

        return {
            migrated: false,
            reason: "already-migrated"
        };

    }

    const localOrders =
        readLocalOrders();

    const localSettings =
        readLocalSettings();

    /*
        Solo importamos pedidos locales cuando
        todavía no existe ese ID en Firestore.

        Así una segunda computadora no sobreescribe
        pedidos existentes.
    */

    if (
        localOrders.length > 0
    ) {

        const batch =
            writeBatch(db);

        for (
            const localOrder
            of localOrders
        ) {

            const normalized =
                normalizeOrder(
                    localOrder
                );

            const reference =
                doc(
                    db,
                    ORDERS_COLLECTION,
                    normalized.id
                );

            const existing =
                await getDoc(
                    reference
                );

            if (!existing.exists()) {

                batch.set(
                    reference,
                    sanitizeForFirestore(
                        normalized
                    )
                );

            }

        }

        await batch.commit();

    }

    if (localSettings) {

        const settingsReference =
            doc(
                db,
                SETTINGS_COLLECTION,
                BUSINESS_SETTINGS_ID
            );

        const existingSettings =
            await getDoc(
                settingsReference
            );

        if (!existingSettings.exists()) {

            await setDoc(
                settingsReference,
                sanitizeForFirestore(
                    localSettings
                )
            );

        }

    }

    /*
        Inicializamos el contador con el folio
        mayor que exista después de migrar.
    */

    const highest =
        await getHighestExistingFolio();

    const counterReference =
        doc(
            db,
            SYSTEM_COLLECTION,
            COUNTER_ID
        );

    await runTransaction(
        db,
        async transaction => {

            const snapshot =
                await transaction.get(
                    counterReference
                );

            const current =
                snapshot.exists()
                    ? Number(
                        snapshot.data()
                            .value || 0
                    )
                    : 0;

            if (highest > current) {

                transaction.set(
                    counterReference,
                    {
                        value:
                            highest,

                        updatedAt:
                            new Date()
                                .toISOString()
                    },
                    {
                        merge: true
                    }
                );

            }

        }
    );

    localStorage.setItem(
        MIGRATION_KEY,
        "complete"
    );

    return {
        migrated: true,
        orders:
            localOrders.length,
        settings:
            Boolean(localSettings)
    };

}


/* =====================================================
   TIEMPO REAL
===================================================== */

function subscribeOrders(callback) {

    let unsubscribe =
        () => {};

    let cancelled =
        false;

    ensureAnonymousSession()
        .then(
            () => {

                if (cancelled) {
                    return;
                }

                const ordersQuery =
                    query(
                        collection(
                            db,
                            ORDERS_COLLECTION
                        ),
                        orderBy(
                            "createdAt",
                            "desc"
                        )
                    );

                unsubscribe =
                    onSnapshot(
                        ordersQuery,
                        snapshot => {

                            const orders =
                                snapshot.docs.map(
                                    item =>
                                        normalizeOrder(
                                            item.data(),
                                            item.id
                                        )
                                );

                            cacheOrders(
                                orders
                            );

                            callback(
                                orders
                            );

                        },
                        error => {

                            console.error(
                                "Error sincronizando pedidos:",
                                error
                            );

                        }
                    );

            }
        )
        .catch(
            error => {

                console.error(
                    "No se pudo iniciar la sincronización:",
                    error
                );

            }
        );

    return () => {

        cancelled = true;

        unsubscribe();

    };

}


/* =====================================================
   API
===================================================== */

const PisadaBacanaDB = {

    normalizeOrder,

    getOrders,
    getOrder,
    saveOrder,
    deleteOrder,

    getNextOrderCode,

    getSettings,
    saveSettings,

    migrateLocalDataOnce,

    subscribeOrders

};


window.PisadaBacanaDB =
    PisadaBacanaDB;


export {
    PisadaBacanaDB
};