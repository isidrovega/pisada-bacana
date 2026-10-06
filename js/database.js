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
   COLECCIONES
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
    if (
        value === undefined ||
        value === null
    ) {
        return value;
    }

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

    /*
        Firestore Timestamp.
    */
    if (
        typeof value?.toDate ===
        "function"
    ) {
        return value
            .toDate()
            .toISOString();
    }

    /*
        Timestamp serializado.
    */
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


function normalizePrefix(prefix) {
    return (
        String(prefix || "PB")
            .trim()
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            ) ||
        "PB"
    );
}


/* =====================================================
   NORMALIZAR PAGOS
===================================================== */

function normalizePayments(
    order,
    total
) {
    let payments =
        Array.isArray(order.payments)
            ? order.payments
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
            (sum, payment) =>
                sum +
                payment.amount,
            0
        );


    /*
        Compatibilidad histórica.

        Si advance/paid decía que había más
        dinero cobrado que payments[],
        agregamos únicamente la diferencia.
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
                    ? "Ajuste histórico"
                    : "Anticipo",

            date:
                toISO(
                    order.createdAt
                ) ||
                new Date()
                    .toISOString()
        });
    }


    /*
        Evitamos que pagos históricos
        superen el total del pedido.

        Esto mantiene consistentes:
        Caja
        Reportes
        Pedidos
        Nota
    */

    let remaining =
        Math.max(
            Number(total) || 0,
            0
        );

    const cappedPayments = [];

    for (
        const payment
        of payments
    ) {
        if (
            remaining <= 0
        ) {
            break;
        }

        const amount =
            Math.min(
                payment.amount,
                remaining
            );

        if (
            amount <= 0
        ) {
            continue;
        }

        cappedPayments.push({
            ...payment,
            amount
        });

        remaining -=
            amount;
    }


    paymentsTotal =
        cappedPayments.reduce(
            (sum, payment) =>
                sum +
                payment.amount,
            0
        );


    return {
        payments:
            cappedPayments,

        paid:
            paymentsTotal
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
            fallbackId ||
            order.id ||
            createId("order")
        );


    let items;

    if (
        Array.isArray(order.items) &&
        order.items.length
    ) {
        items =
            order.items.map(
                (item, index) => ({
                    id:
                        item.id ||
                        `item-${id}-${index + 1}`,

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
            );

    } else {
        items = [{
            id:
                `item-${id}-1`,

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
                        order.total ??
                        order.price ??
                        0
                    ),
                    0
                )
        }];
    }


    const itemTotal =
        items.reduce(
            (sum, item) =>
                sum +
                Math.max(
                    Number(
                        item.price || 0
                    ),
                    0
                ),
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


    const paymentData =
        normalizePayments(
            order,
            total
        );


    const paid =
        Math.min(
            paymentData.paid,
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
        items[0] || {};


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
            total será el campo conceptual canónico.
            price se conserva porque varios módulos
            históricos todavía lo utilizan.
        */

        total,

        price:
            total,

        payments:
            paymentData.payments,

        paid,

        /*
            Compatibilidad con versiones antiguas.
        */

        advance:
            paid,

        balance,

        paymentMethod:
            String(
                order.paymentMethod ||
                paymentData.payments[0]
                    ?.method ||
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

        /*
            Campos compatibles con el modelo antiguo.
        */

        itemType:
            firstItem.itemType ||
            "Tenis",

        brand:
            firstItem.brand ||
            "",

        model:
            firstItem.model ||
            "",

        color:
            firstItem.color ||
            "",

        service:
            items.length === 1
                ? (
                    firstItem.service ||
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

    const value =
        String(orderId || "")
            .trim();

    if (!value) {
        return null;
    }

    const reference =
        doc(
            db,
            ORDERS_COLLECTION,
            value
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

    const reference =
        doc(
            db,
            ORDERS_COLLECTION,
            normalized.id
        );

    await setDoc(
        reference,
        sanitizeForFirestore(
            normalized
        ),
        {
            merge:
                true
        }
    );

    return normalized;
}


async function deleteOrder(orderId) {
    await ensureAnonymousSession();

    const value =
        String(orderId || "")
            .trim();

    if (!value) {
        throw new Error(
            "ID de pedido inválido."
        );
    }

    await deleteDoc(
        doc(
            db,
            ORDERS_COLLECTION,
            value
        )
    );
}


/* =====================================================
   CONTADOR / FOLIO
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

    const cleanPrefix =
        normalizePrefix(
            prefix
        );

    const counterReference =
        doc(
            db,
            SYSTEM_COLLECTION,
            COUNTER_ID
        );

    /*
        Mantiene compatibilidad con pedidos
        restaurados o creados antes del contador.
    */

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

                const stored =
                    snapshot.exists()
                        ? Math.max(
                            Number(
                                snapshot
                                    .data()
                                    .value ||
                                0
                            ),
                            0
                        )
                        : 0;

                const current =
                    Math.max(
                        stored,
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
                            cleanPrefix,

                        updatedAt:
                            new Date()
                                .toISOString()
                    },
                    {
                        merge:
                            true
                    }
                );

                return next;
            }
        );


    return (
        `${cleanPrefix}-` +
        String(nextNumber)
            .padStart(
                4,
                "0"
            )
    );
}


/* =====================================================
   AJUSTES
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

    const data = {
        ...clean,

        updatedAt:
            new Date()
                .toISOString()
    };

    /*
        "id" sólo es útil en memoria.
        No necesitamos almacenarlo dentro
        del documento.
    */

    delete data.id;

    await setDoc(
        doc(
            db,
            SETTINGS_COLLECTION,
            BUSINESS_SETTINGS_ID
        ),
        data,
        {
            merge:
                false
        }
    );

    return {
        id:
            BUSINESS_SETTINGS_ID,

        ...data
    };
}


/* =====================================================
   TIEMPO REAL: PEDIDOS
===================================================== */

function subscribeOrders(
    callback,
    errorCallback = null
) {
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

                            if (
                                typeof callback ===
                                "function"
                            ) {
                                callback(
                                    orders
                                );
                            }
                        },

                        error => {
                            console.error(
                                "Error sincronizando pedidos:",
                                error
                            );

                            if (
                                typeof errorCallback ===
                                "function"
                            ) {
                                errorCallback(
                                    error
                                );
                            }
                        }
                    );
            }
        )
        .catch(
            error => {
                console.error(
                    "No se pudo iniciar la sincronización de pedidos:",
                    error
                );

                if (
                    typeof errorCallback ===
                    "function"
                ) {
                    errorCallback(
                        error
                    );
                }
            }
        );

    return () => {
        cancelled =
            true;

        unsubscribe();
    };
}


/* =====================================================
   TIEMPO REAL: AJUSTES
===================================================== */

function subscribeSettings(
    callback,
    errorCallback = null
) {
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
                            const settings =
                                snapshot.exists()
                                    ? {
                                        id:
                                            snapshot.id,

                                        ...snapshot.data()
                                    }
                                    : null;

                            if (
                                typeof callback ===
                                "function"
                            ) {
                                callback(
                                    settings
                                );
                            }
                        },

                        error => {
                            console.error(
                                "Error sincronizando ajustes:",
                                error
                            );

                            if (
                                typeof errorCallback ===
                                "function"
                            ) {
                                errorCallback(
                                    error
                                );
                            }
                        }
                    );
            }
        )
        .catch(
            error => {
                console.error(
                    "No se pudo iniciar la sincronización de ajustes:",
                    error
                );

                if (
                    typeof errorCallback ===
                    "function"
                ) {
                    errorCallback(
                        error
                    );
                }
            }
        );

    return () => {
        cancelled =
            true;

        unsubscribe();
    };
}


/* =====================================================
   REEMPLAZAR PEDIDOS
   Usado por restauración de respaldos
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


    /*
        Firestore permite hasta 500 operaciones
        por batch. Usamos 400 para dejar margen.
    */

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

                        return;
                    }

                    batch.set(
                        operation.reference,
                        operation.data
                    );
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
            merge:
                true
        }
    );


    return getOrders();
}


/* =====================================================
   ELIMINAR TODOS LOS PEDIDOS
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
            merge:
                true
        }
    );
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

    subscribeOrders,
    subscribeSettings,

    replaceOrders,
    deleteAllOrders
};


window.PisadaBacanaDB =
    PisadaBacanaDB;


export {
    PisadaBacanaDB
};