"use strict";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STORAGE_KEY = "pisadaBacanaOrders";

let orders = loadOrders();
let movements = [];


/* =====================================================
   ELEMENTOS
===================================================== */

const sidebar =
    document.getElementById("sidebar");

const menuButton =
    document.getElementById("menuButton");

const overlay =
    document.getElementById("overlay");

const currentDate =
    document.getElementById("currentDate");

const navOrderCount =
    document.getElementById("navOrderCount");


/* MÉTRICAS */

const totalCollected =
    document.getElementById("totalCollected");

const todayCollected =
    document.getElementById("todayCollected");

const todayPaymentsCount =
    document.getElementById("todayPaymentsCount");

const totalPending =
    document.getElementById("totalPending");

const pendingOrdersCount =
    document.getElementById("pendingOrdersCount");

const totalSales =
    document.getElementById("totalSales");


/* MÉTODOS */

const cashTotal =
    document.getElementById("cashTotal");

const cashCount =
    document.getElementById("cashCount");

const transferTotal =
    document.getElementById("transferTotal");

const transferCount =
    document.getElementById("transferCount");

const cardTotal =
    document.getElementById("cardTotal");

const cardCount =
    document.getElementById("cardCount");

const otherTotal =
    document.getElementById("otherTotal");

const otherCount =
    document.getElementById("otherCount");


/* PENDIENTES */

const pendingList =
    document.getElementById("pendingList");

const pendingEmpty =
    document.getElementById("pendingEmpty");


/* MOVIMIENTOS */

const searchInput =
    document.getElementById("searchInput");

const periodFilter =
    document.getElementById("periodFilter");

const methodFilter =
    document.getElementById("methodFilter");

const resultCount =
    document.getElementById("resultCount");

const filteredTotal =
    document.getElementById("filteredTotal");

const movementsTable =
    document.getElementById("movementsTable");

const emptyState =
    document.getElementById("emptyState");


/* =====================================================
   STORAGE
===================================================== */

function loadOrders() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
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
            "Error cargando pedidos:",
            error
        );

        return [];

    }

}


/* =====================================================
   UTILIDADES
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatMoney(value) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(
        Number(value) || 0
    );

}


function formatDateTime(value) {

    if (!value) {
        return "Sin fecha";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);

}


function setCurrentDate() {

    currentDate.textContent =
        new Intl.DateTimeFormat(
            "es-MX",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(
            new Date()
        );

}


function getOrderBalance(order) {

    if (
        typeof order.balance === "number"
    ) {

        return Math.max(
            Number(order.balance),
            0
        );

    }

    return Math.max(
        Number(order.price || 0) -
        Number(order.advance || 0),
        0
    );

}


function normalizeMethod(method) {

    const value =
        String(method || "")
            .trim()
            .toLowerCase();


    if (
        value === "efectivo"
    ) {
        return "Efectivo";
    }


    if (
        value === "transferencia"
    ) {
        return "Transferencia";
    }


    if (
        value === "tarjeta"
    ) {
        return "Tarjeta";
    }


    return "Otro";

}


function getLocalDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function isSameLocalDay(
    firstDate,
    secondDate
) {

    return (
        getLocalDateKey(firstDate) ===
        getLocalDateKey(secondDate)
    );

}


/* =====================================================
   CONSTRUIR MOVIMIENTOS
===================================================== */

/*
    Caja se construye usando:

    1. El anticipo inicial del pedido.
    2. Los pagos adicionales guardados
       en order.payments por pedidos.js.

    Esto evita tener dos bases de datos
    diferentes para la misma información.
*/

function buildMovements() {

    const result = [];


    orders.forEach(
        order => {

            const initialAdvance =
                Number(
                    order.advance || 0
                );


            const registeredPayments =
                Array.isArray(
                    order.payments
                )
                    ? order.payments
                    : [];


            const additionalPaymentsTotal =
                registeredPayments.reduce(
                    (total, payment) =>
                        total +
                        Number(
                            payment.amount || 0
                        ),
                    0
                );


            /*
                pedidos.js incrementa order.advance
                cuando se registra un pago adicional.

                Por eso debemos restar esos pagos para
                recuperar el anticipo original y evitar
                contar el dinero dos veces.
            */

            const originalAdvance =
                Math.max(
                    initialAdvance -
                    additionalPaymentsTotal,
                    0
                );


            if (
                originalAdvance > 0
            ) {

                result.push({

                    id:
                        `${order.id}-initial`,

                    orderId:
                        order.id,

                    code:
                        order.code,

                    clientName:
                        order.clientName,

                    amount:
                        originalAdvance,

                    method:
                        normalizeMethod(
                            order.paymentMethod
                        ),

                    rawMethod:
                        order.paymentMethod ||
                        "Sin especificar",

                    type:
                        "Anticipo",

                    date:
                        order.createdAt ||
                        new Date(0)
                            .toISOString()

                });

            }


            registeredPayments.forEach(
                (payment, index) => {

                    const amount =
                        Number(
                            payment.amount || 0
                        );


                    if (
                        amount <= 0
                    ) {
                        return;
                    }


                    result.push({

                        id:
                            `${order.id}-payment-${index}`,

                        orderId:
                            order.id,

                        code:
                            order.code,

                        clientName:
                            order.clientName,

                        amount,

                        method:
                            normalizeMethod(
                                payment.method
                            ),

                        rawMethod:
                            payment.method ||
                            "Sin especificar",

                        type:
                            "Pago",

                        date:
                            payment.date ||
                            order.updatedAt ||
                            order.createdAt ||
                            new Date(0)
                                .toISOString()

                    });

                }
            );

        }
    );


    movements =
        result.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );

}


/* =====================================================
   ESTADÍSTICAS
===================================================== */

function renderStats() {

    const totalSalesValue =
        orders.reduce(
            (total, order) =>
                total +
                Number(
                    order.price || 0
                ),
            0
        );


    const collectedValue =
        movements.reduce(
            (total, movement) =>
                total +
                movement.amount,
            0
        );


    const pendingValue =
        orders.reduce(
            (total, order) =>
                total +
                getOrderBalance(order),
            0
        );


    const pendingOrders =
        orders.filter(
            order =>
                getOrderBalance(order) > 0
        );


    const now =
        new Date();


    const todayMovements =
        movements.filter(
            movement => {

                const date =
                    new Date(
                        movement.date
                    );

                return (
                    !Number.isNaN(
                        date.getTime()
                    ) &&
                    isSameLocalDay(
                        date,
                        now
                    )
                );

            }
        );


    const todayValue =
        todayMovements.reduce(
            (total, movement) =>
                total +
                movement.amount,
            0
        );


    totalCollected.textContent =
        formatMoney(
            collectedValue
        );


    todayCollected.textContent =
        formatMoney(
            todayValue
        );


    todayPaymentsCount.textContent =
        `${todayMovements.length} ${
            todayMovements.length === 1
                ? "movimiento"
                : "movimientos"
        }`;


    totalPending.textContent =
        formatMoney(
            pendingValue
        );


    pendingOrdersCount.textContent =
        `${pendingOrders.length} ${
            pendingOrders.length === 1
                ? "pedido"
                : "pedidos"
        }`;


    totalSales.textContent =
        formatMoney(
            totalSalesValue
        );


    navOrderCount.textContent =
        orders.filter(
            order =>
                order.status !== "Entregado"
        ).length;

}


/* =====================================================
   MÉTODOS DE PAGO
===================================================== */

function renderPaymentMethods() {

    const groups = {

        Efectivo: {
            total: 0,
            count: 0
        },

        Transferencia: {
            total: 0,
            count: 0
        },

        Tarjeta: {
            total: 0,
            count: 0
        },

        Otro: {
            total: 0,
            count: 0
        }

    };


    movements.forEach(
        movement => {

            const group =
                groups[
                    movement.method
                ] ||
                groups.Otro;


            group.total +=
                movement.amount;

            group.count += 1;

        }
    );


    setMethodValues(
        cashTotal,
        cashCount,
        groups.Efectivo
    );


    setMethodValues(
        transferTotal,
        transferCount,
        groups.Transferencia
    );


    setMethodValues(
        cardTotal,
        cardCount,
        groups.Tarjeta
    );


    setMethodValues(
        otherTotal,
        otherCount,
        groups.Otro
    );

}


function setMethodValues(
    totalElement,
    countElement,
    data
) {

    totalElement.textContent =
        formatMoney(
            data.total
        );


    countElement.textContent =
        `${data.count} ${
            data.count === 1
                ? "movimiento"
                : "movimientos"
        }`;

}


/* =====================================================
   SALDOS PENDIENTES
===================================================== */

function renderPendingOrders() {

    pendingList.innerHTML = "";


    const pendingOrders =
        orders
            .filter(
                order =>
                    getOrderBalance(order) > 0
            )
            .sort(
                (a, b) =>
                    getOrderBalance(b) -
                    getOrderBalance(a)
            )
            .slice(
                0,
                6
            );


    if (
        pendingOrders.length === 0
    ) {

        pendingEmpty.classList.add(
            "visible"
        );

        return;

    }


    pendingEmpty.classList.remove(
        "visible"
    );


    pendingOrders.forEach(
        order => {

            const item =
                document.createElement(
                    "div"
                );


            const article =
                [
                    order.brand,
                    order.model
                ]
                    .filter(Boolean)
                    .join(" ") ||
                order.itemType ||
                "Artículo";


            item.className =
                "pending-item";


            item.innerHTML = `
                <div class="pending-info">

                    <strong>
                        ${escapeHTML(
                            order.code
                        )}
                        ·
                        ${escapeHTML(
                            order.clientName
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(article)}
                        ·
                        ${escapeHTML(
                            order.status
                        )}
                    </span>

                </div>

                <div class="pending-amount">
                    ${formatMoney(
                        getOrderBalance(order)
                    )}
                </div>
            `;


            pendingList.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   FILTRAR MOVIMIENTOS
===================================================== */

function getFilteredMovements() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const period =
        periodFilter.value;


    const method =
        methodFilter.value;


    const now =
        new Date();


    return movements.filter(
        movement => {

            const searchableText = [
                movement.code,
                movement.clientName,
                movement.type,
                movement.method,
                movement.rawMethod
            ]
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchableText.includes(
                    search
                );


            const matchesMethod =
                method === "Todos" ||
                movement.method === method;


            const movementDate =
                new Date(
                    movement.date
                );


            let matchesPeriod =
                true;


            if (
                Number.isNaN(
                    movementDate.getTime()
                )
            ) {

                matchesPeriod =
                    period === "all";

            } else if (
                period === "today"
            ) {

                matchesPeriod =
                    isSameLocalDay(
                        movementDate,
                        now
                    );

            } else if (
                period === "week"
            ) {

                const start =
                    new Date(now);

                start.setHours(
                    0,
                    0,
                    0,
                    0
                );

                start.setDate(
                    start.getDate() - 6
                );


                matchesPeriod =
                    movementDate >= start &&
                    movementDate <= now;

            } else if (
                period === "month"
            ) {

                matchesPeriod =
                    movementDate.getFullYear() ===
                        now.getFullYear() &&
                    movementDate.getMonth() ===
                        now.getMonth();

            }


            return (
                matchesSearch &&
                matchesMethod &&
                matchesPeriod
            );

        }
    );

}


/* =====================================================
   TABLA DE MOVIMIENTOS
===================================================== */

function renderMovements() {

    const filtered =
        getFilteredMovements();


    movementsTable.innerHTML = "";


    const shownTotal =
        filtered.reduce(
            (total, movement) =>
                total +
                movement.amount,
            0
        );


    resultCount.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? "movimiento"
                : "movimientos"
        }`;


    filteredTotal.textContent =
        `Total mostrado: ${formatMoney(
            shownTotal
        )}`;


    if (
        filtered.length === 0
    ) {

        emptyState.classList.add(
            "visible"
        );

        return;

    }


    emptyState.classList.remove(
        "visible"
    );


    filtered.forEach(
        movement => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `
                <td>

                    <span class="cell-main">
                        ${escapeHTML(
                            formatDateTime(
                                movement.date
                            )
                        )}
                    </span>

                </td>


                <td>

                    <span class="order-code">
                        ${escapeHTML(
                            movement.code
                        )}
                    </span>

                </td>


                <td>

                    <span class="cell-main">
                        ${escapeHTML(
                            movement.clientName
                        )}
                    </span>

                </td>


                <td>

                    <span class="cell-main">
                        ${escapeHTML(
                            movement.type
                        )}
                    </span>

                    <span class="cell-sub">
                        Pedido
                        ${escapeHTML(
                            movement.code
                        )}
                    </span>

                </td>


                <td>

                    <span class="method-badge">
                        ${escapeHTML(
                            movement.method ===
                            "Otro"

                                ? (
                                    movement.rawMethod ||
                                    "Sin especificar"
                                )

                                : movement.method
                        )}
                    </span>

                </td>


                <td>

                    <strong class="money-positive">
                        +${formatMoney(
                            movement.amount
                        )}
                    </strong>

                </td>
            `;


            movementsTable.appendChild(
                row
            );

        }
    );

}


/* =====================================================
   SIDEBAR
===================================================== */

function openSidebar() {

    sidebar.classList.add(
        "open"
    );


    overlay.classList.add(
        "visible"
    );


    document.body.style.overflow =
        "hidden";

}


function closeSidebar() {

    sidebar.classList.remove(
        "open"
    );


    overlay.classList.remove(
        "visible"
    );


    document.body.style.overflow =
        "";

}


/* =====================================================
   ENLACES FUTUROS
===================================================== */

document
    .querySelectorAll(
        ".future-link"
    )
    .forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const page =
                        link
                            .getAttribute(
                                "href"
                            )
                            .replace(
                                ".html",
                                ""
                            );


                    alert(
                        `El módulo "${page}" todavía no está construido.`
                    );

                }
            );

        }
    );


/* =====================================================
   RENDER GENERAL
===================================================== */

function renderEverything() {

    /*
        Volvemos a leer localStorage para
        mostrar cualquier cambio realizado
        desde Pedidos.
    */

    orders =
        loadOrders();


    buildMovements();

    renderStats();

    renderPaymentMethods();

    renderPendingOrders();

    renderMovements();

}


/* =====================================================
   EVENTOS
===================================================== */

searchInput.addEventListener(
    "input",
    renderMovements
);


periodFilter.addEventListener(
    "change",
    renderMovements
);


methodFilter.addEventListener(
    "change",
    renderMovements
);


menuButton.addEventListener(
    "click",
    () => {

        if (
            sidebar.classList.contains(
                "open"
            )
        ) {

            closeSidebar();

        } else {

            openSidebar();

        }

    }
);


overlay.addEventListener(
    "click",
    closeSidebar
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeSidebar();

        }

    }
);


/*
    Si localStorage cambia desde otra
    pestaña del navegador, Caja se actualiza.
*/

window.addEventListener(
    "storage",
    event => {

        if (
            event.key === STORAGE_KEY
        ) {

            renderEverything();

        }

    }
);


/*
    Cuando regresamos a Caja después
    de visitar Pedidos, actualizamos
    los datos nuevamente.
*/

window.addEventListener(
    "pageshow",
    renderEverything
);


/* =====================================================
   INICIO
===================================================== */

function initialize() {

    setCurrentDate();

    renderEverything();

}


initialize();