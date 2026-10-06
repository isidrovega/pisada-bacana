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

const ORDERS_COLLECTION =
    "orders";

const SETTINGS_COLLECTION =
    "settings";

const SYSTEM_COLLECTION =
    "system";

const BUSINESS_SETTINGS_ID =
    "business";

const COUNTER_ID =
    "orderCounter";


/*
    Estas claves existen ÚNICAMENTE para importar
    datos históricos.

    No son utilizadas como base activa.
*/

const LOCAL_ORDERS_KEY =
    "pisadaBacanaOrders";

const LOCAL_SETTINGS_KEY =
    "pisadaBacanaSettings";

const MIGRATION_KEY =
    "pisadaBacanaFirestoreMigrationV1";


/* =====================================================
   UTILIDADES
===================================================== */

function createId(prefix = "id") {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
            "function"
    ) {

        return (
            `${prefix}-` +
            window.crypto.randomUUID()
        );
    }

    return (
        `${prefix}-${Date.now()}-` +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}


function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );
}


function sanitizeForFirestore(value) {

    if (Array.isArray(value)) {

        return value.map(
            sanitizeForFirestore
        );
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


function toISO(value) {

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {

        return value
            .toDate()
            .toISOString();
    }

    if (
        typeof value === "object" &&
        typeof value.seconds ===
            "number"
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


function getCodeNumber(code) {

    const match =
        String(code || "")
            .match(/(\d+)$/);

    return match
        ? Number(match[1])
        : 0;
}


/* =====================================================
   PAGOS
===================================================== */

function normalizePayments(order) {

    const payments =
        Array.isArray(order.payments)
            ? clone(order.payments)
                .map(
                    payment => ({
                        id:
                            payment.id ||
                            createId(
                                "payment"
                            ),

                        amount:
                            Math.max(
                                Number(
                                    payment.amount ||
                                    0
                                ),
                                0
                            ),

                        method:
                            String(
                                payment.method ||
                                order.paymentMethod ||
                                "Efectivo"
                            ),

                        type:
                            String(
                                payment.type ||
                                "Pago"
                            ),

                        date:
                            toISO(
                                payment.date
                            ) ||
                            toISO(
                                order.createdAt
                            ) ||
                            new Date()
                                .toISOString()
                    })
                )
                .filter(
                    payment =>
                        payment.amount > 0
                )
            : [];


    const legacyPaid =
        Math.max(
            Number(
                order.paid ??
                order.advance ??
                0
            ),
            0
        );


    let paymentsTotal =
        payments.reduce(
            (total, payment) =>
                total +
                payment.amount,
            0
        );


    /*
        Si advance/paid contiene más dinero
        que payments[], añadimos solamente
        la diferencia.

        Esto evita duplicar anticipos.
    */

    if (
        legacyPaid >
        paymentsTotal + 0.005
    ) {

        payments.unshift({
            id:
                createId(
                    "payment"
                ),

            amount:
                legacyPaid -
                paymentsTotal,

            method:
                String(
                    order.paymentMethod ||
                    "Efectivo"
                ),

            type:
                payments.length
                    ? "Ajuste de migración"
                    : "Anticipo",

            date:
                toISO(
                    order.createdAt
                ) ||
                new Date()
                    .toISOString()
        });


        paymentsTotal =
            payments.reduce(
                (total, payment) =>
                    total +
                    payment.amount,
                0
            );
    }


    return {
        payments,
        paid:
            Math.max(
                paymentsTotal,
                legacyPaid
            )
    };
}


/* =====================================================
   NORMALIZACIÓN DE PEDIDOS
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
        order.items.length
            ? order.items.map(
                item => ({
                    id:
                        item.id ||
                        createId(
                            "item"
                        ),

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
                    createId(
                        "item"
                    ),

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
            (total, item) =>
                total +
                item.price,
            0
        );


    const total =
        itemTotal > 0
            ? itemTotal
            : Math.max(
                Number(
                    order.total ??
                    order.price ??
                    0
                ),
                0
            );


    const {
        payments,
        paid: rawPaid
    } =
        normalizePayments(order);


    /*
        Nunca permitimos contablemente
        cobrar más que el total.
    */

    const paid =
        Math.min(
            rawPaid,
            total
        );


    const balance =
        Math.max(
            total - paid,
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


    const firstItem =
        items[0];


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

        /*
            total es canónico.
            price se mantiene por compatibilidad.
        */

        total,
        price:
            total,

        payments,

        paid,

        /*
            advance se conserva para compatibilidad
            con respaldos antiguos.
        */

        advance:
            paid,

        balance,

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

        itemType:
            firstItem?.itemType ||
            "Tenis",

        brand:
            firstItem?.brand ||
            "",

        model:
            firstItem?.model ||
            "",

        color:
            firstItem?.color ||
            "",

        service:
            items.length === 1
                ? (
                    firstItem?.service ||
                    ""
                )
                : `${items.length} artículos`,

        createdAt,
        updatedAt
    };


    const deliveredAt =
        toISO(
            order.deliveredAt
        );


    if (deliveredAt) {

        normalized.deliveredAt =
            deliveredAt;

    } else {

        delete normalized
            .deliveredAt;
    }


    return normalized;
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


    return snapshot.docs.map(
        snapshotDocument =>
            normalizeOrder(
                snapshotDocument.data(),
                snapshotDocument.id
            )
    );
}


async function getOrder(orderId) {

    await ensureAnonymousSession();


    const reference =
        doc(
            db,
            ORDERS_COLLECTION,
            String(orderId)
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


async function removeOrder(orderId) {

    await ensureAnonymousSession();


    await deleteDoc(
        doc(
            db,
            ORDERS_COLLECTION,
            String(orderId)
        )
    );
}


/* =====================================================
   FOLIOS
===================================================== */

async function getHighestExistingFolio() {

    const snapshot =
        await getDocs(
            collection(
                db,
                ORDERS_COLLECTION
            )
        );


    return snapshot.docs.reduce(
        (highest, item) =>
            Math.max(
                highest,
                getCodeNumber(
                    item.data()?.code
                )
            ),
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
            .trim()
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            ) ||
        "PB";


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


                const storedValue =
                    snapshot.exists()
                        ? Number(
                            snapshot.data()
                                .value || 0
                        )
                        : 0;


                const current =
                    Math.max(
                        storedValue,
                        highestExisting
                    );


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
   SETTINGS
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
        return null;
    }


    return {
        id:
            snapshot.id,

        ...snapshot.data()
    };
}


async function saveSettings(settings) {

    await ensureAnonymousSession();


    const clean =
        sanitizeForFirestore(
            settings || {}
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


    return clean;
}


/* =====================================================
   TIEMPO REAL - PEDIDOS
===================================================== */

function subscribeOrders(callback) {

    let unsubscribe =
        () => {};

    let cancelled =
        false;


    ensureAnonymousSession()
        .then(() => {

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
        })
        .catch(error => {

            console.error(
                "No se pudo iniciar la sincronización de pedidos:",
                error
            );
        });


    return () => {

        cancelled = true;
        unsubscribe();
    };
}


/* =====================================================
   TIEMPO REAL - SETTINGS
===================================================== */

function subscribeSettings(callback) {

    let unsubscribe =
        () => {};

    let cancelled =
        false;


    ensureAnonymousSession()
        .then(() => {

            if (cancelled) {
                return;
            }


            const reference =
                doc(
                    db,
                    SETTINGS_COLLECTION,
                    BUSINESS_SETTINGS_ID
                );


            unsubscribe =
                onSnapshot(
                    reference,
                    snapshot => {

                        callback(
                            snapshot.exists()
                                ? {
                                    id:
                                        snapshot.id,

                                    ...snapshot.data()
                                }
                                : null
                        );
                    },
                    error => {

                        console.error(
                            "Error sincronizando ajustes:",
                            error
                        );
                    }
                );
        })
        .catch(error => {

            console.error(
                "No se pudo iniciar la sincronización de ajustes:",
                error
            );
        });


    return () => {

        cancelled = true;
        unsubscribe();
    };
}


/* =====================================================
   RESTAURACIÓN
===================================================== */

async function replaceOrders(
    newOrders
) {

    await ensureAnonymousSession();


    const incoming =
        Array.isArray(newOrders)
            ? newOrders
            : [];


    const existingSnapshot =
        await getDocs(
            collection(
                db,
                ORDERS_COLLECTION
            )
        );


    const operations = [];


    existingSnapshot.docs.forEach(
        snapshotDocument => {

            operations.push({
                type:
                    "delete",

                reference:
                    snapshotDocument.ref
            });
        }
    );


    incoming.forEach(
        sourceOrder => {

            const normalized =
                normalizeOrder(
                    sourceOrder
                );


            operations.push({
                type:
                    "set",

                reference:
                    doc(
                        db,
                        ORDERS_COLLECTION,
                        normalized.id
                    ),

                data:
                    sanitizeForFirestore(
                        normalized
                    )
            });
        }
    );


    for (
        let index = 0;
        index < operations.length;
        index += 400
    ) {

        const batch =
            writeBatch(db);


        operations
            .slice(
                index,
                index + 400
            )
            .forEach(
                operation => {

                    if (
                        operation.type ===
                        "delete"
                    ) {

                        batch.delete(
                            operation.reference
                        );

                    } else {

                        batch.set(
                            operation.reference,
                            operation.data
                        );
                    }
                }
            );


        await batch.commit();
    }


    const highest =
        incoming.reduce(
            (maximum, order) =>
                Math.max(
                    maximum,
                    getCodeNumber(
                        order.code
                    )
                ),
            0
        );


    await setDoc(
        doc(
            db,
            SYSTEM_COLLECTION,
            COUNTER_ID
        ),
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


    return getOrders();
}


/* =====================================================
   ELIMINAR TODOS
===================================================== */

async function deleteAllOrders() {

    await ensureAnonymousSession();


    const snapshot =
        await getDocs(
            collection(
                db,
                ORDERS_COLLECTION
            )
        );


    const references =
        snapshot.docs.map(
            item =>
                item.ref
        );


    for (
        let index = 0;
        index < references.length;
        index += 400
    ) {

        const batch =
            writeBatch(db);


        references
            .slice(
                index,
                index + 400
            )
            .forEach(
                reference => {

                    batch.delete(
                        reference
                    );
                }
            );


        await batch.commit();
    }


    await setDoc(
        doc(
            db,
            SYSTEM_COLLECTION,
            COUNTER_ID
        ),
        {
            value:
                0,

            updatedAt:
                new Date()
                    .toISOString()
        },
        {
            merge: true
        }
    );
}


/* =====================================================
   MIGRACIÓN HISTÓRICA
===================================================== */

function readLegacyOrders() {

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
            "No se pudieron leer los pedidos históricos:",
            error
        );


        return [];
    }
}


function readLegacySettings() {

    try {

        const stored =
            localStorage.getItem(
                LOCAL_SETTINGS_KEY
            );


        if (!stored) {
            return null;
        }


        return JSON.parse(
            stored
        );

    } catch (error) {

        console.error(
            "No se pudieron leer los ajustes históricos:",
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
            migrated:
                false,

            reason:
                "already-migrated"
        };
    }


    const localOrders =
        readLegacyOrders();

    const localSettings =
        readLegacySettings();


    /*
        Migramos pedidos uno por uno de manera
        idempotente.

        Si el ID ya existe en Firestore,
        no lo sobreescribimos.
    */

    for (
        let index = 0;
        index < localOrders.length;
        index += 400
    ) {

        const batch =
            writeBatch(db);


        const group =
            localOrders.slice(
                index,
                index + 400
            );


        for (
            const sourceOrder
            of group
        ) {

            const normalized =
                normalizeOrder(
                    sourceOrder
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


    /*
        Settings históricos solamente se importan
        si Firestore todavía no tiene configuración.
    */

    if (localSettings) {

        const settingsReference =
            doc(
                db,
                SETTINGS_COLLECTION,
                BUSINESS_SETTINGS_ID
            );


        const existing =
            await getDoc(
                settingsReference
            );


        if (!existing.exists()) {

            await setDoc(
                settingsReference,
                sanitizeForFirestore(
                    localSettings
                )
            );
        }
    }


    /*
        Sincronizamos contador.
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
        migrated:
            true,

        orders:
            localOrders.length,

        settings:
            Boolean(
                localSettings
            )
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

    deleteOrder:
        removeOrder,

    getNextOrderCode,

    getSettings,
    saveSettings,

    subscribeOrders,
    subscribeSettings,

    replaceOrders,
    deleteAllOrders,

    migrateLocalDataOnce
};


window.PisadaBacanaDB =
    PisadaBacanaDB;


export {
    PisadaBacanaDB
};