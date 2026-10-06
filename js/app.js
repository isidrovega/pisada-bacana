"use strict";

function getDatabase() {

    if (!window.PisadaBacanaDB) {

        throw new Error(
            "Firebase todavía no está listo."
        );

    }

    return window.PisadaBacanaDB;

}

const STORAGE_KEY = "pisadaBacanaOrders";

const STATUS_CLASSES = {
    "Recibido": "status-received",
    "En espera": "status-waiting",
    "Lavando": "status-washing",
    "Secando": "status-drying",
    "Listo": "status-ready",
    "Entregado": "status-delivered"
};

let orders = [];
let unsubscribeOrders = null;
let toastTimer = null;


/* ELEMENTOS */

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


const activeOrders =
    document.getElementById("activeOrders");

const processOrders =
    document.getElementById("processOrders");

const readyOrders =
    document.getElementById("readyOrders");

const totalIncome =
    document.getElementById("totalIncome");


const receivedCount =
    document.getElementById("receivedCount");

const summaryProcess =
    document.getElementById("summaryProcess");

const summaryReady =
    document.getElementById("summaryReady");


const nextDelivery =
    document.getElementById("nextDelivery");

const nextDeliveryClient =
    document.getElementById("nextDeliveryClient");


const ordersTable =
    document.getElementById("ordersTable");

const emptyState =
    document.getElementById("emptyState");


const newOrderButton =
    document.getElementById("newOrderButton");

const emptyNewOrderButton =
    document.getElementById("emptyNewOrderButton");


const orderModal =
    document.getElementById("orderModal");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelOrderButton =
    document.getElementById("cancelOrderButton");

const orderForm =
    document.getElementById("orderForm");


const priceInput =
    document.getElementById("price");

const advanceInput =
    document.getElementById("advance");

const balancePreview =
    document.getElementById("balancePreview");

const deliveryDate =
    document.getElementById("deliveryDate");


const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");


/* STORAGE */

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


function saveOrders() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(orders)
    );

}


/* UTILIDADES */

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


function getLocalISODate(date = new Date()) {

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


function formatDate(dateString) {

    if (!dateString) {
        return "Sin fecha";
    }

    const [
        year,
        month,
        day
    ] = dateString
        .split("-")
        .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
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


function setDefaultDeliveryDate() {

    const date =
        new Date();

    date.setDate(
        date.getDate() + 3
    );

    deliveryDate.value =
        getLocalISODate(date);

    deliveryDate.min =
        getLocalISODate();

}


function generateOrderCode() {

    const highest =
        orders.reduce(
            (max, order) => {

                const number =
                    Number(
                        String(
                            order.code || ""
                        ).replace(
                            "PB-",
                            ""
                        )
                    );

                if (
                    Number.isNaN(number)
                ) {
                    return max;
                }

                return Math.max(
                    max,
                    number
                );

            },
            0
        );

    return `PB-${String(
        highest + 1
    ).padStart(
        4,
        "0"
    )}`;

}


/* DASHBOARD */

function renderStats() {

    const active =
        orders.filter(
            order =>
                order.status !== "Entregado"
        );

    const process =
        orders.filter(
            order =>
                order.status === "Lavando" ||
                order.status === "Secando"
        );

    const ready =
        orders.filter(
            order =>
                order.status === "Listo"
        );

    const received =
        orders.filter(
            order =>
                order.status === "Recibido"
        );

    const income =
    orders.reduce(
        (total, order) =>
            total +
            Math.max(
                Number(
                    order.paid ??
                    order.advance ??
                    0
                ),
                0
            ),
        0
    );


    activeOrders.textContent =
        active.length;

    processOrders.textContent =
        process.length;

    readyOrders.textContent =
        ready.length;

    totalIncome.textContent =
        formatMoney(income);


    receivedCount.textContent =
        received.length;

    summaryProcess.textContent =
        process.length;

    summaryReady.textContent =
        ready.length;


    navOrderCount.textContent =
        active.length;

}


function renderRecentOrders() {

    ordersTable.innerHTML = "";

    if (
        orders.length === 0
    ) {

        emptyState.classList.add(
            "visible"
        );

        return;

    }

    emptyState.classList.remove(
        "visible"
    );


    const recent =
        [...orders]
            .sort(
                (a, b) =>
                    new Date(
                        b.createdAt || 0
                    ) -
                    new Date(
                        a.createdAt || 0
                    )
            )
            .slice(
                0,
                7
            );


    recent.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );


            const itemName = [
                order.brand,
                order.model
            ]
                .filter(Boolean)
                .join(" ");


            const statusClass =
                STATUS_CLASSES[
                    order.status
                ] ||
                "status-received";


            row.innerHTML = `
                <td>
                    <span class="order-code">
                        ${escapeHTML(order.code)}
                    </span>
                </td>

                <td>
                    <span class="cell-main">
                        ${escapeHTML(order.clientName)}
                    </span>

                    <span class="cell-sub">
                        ${escapeHTML(order.phone)}
                    </span>
                </td>

                <td>
                    <span class="cell-main">
                        ${escapeHTML(
                            itemName ||
                            order.itemType
                        )}
                    </span>

                    <span class="cell-sub">
                        ${escapeHTML(order.service)}
                    </span>
                </td>

                <td>
                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHTML(order.status)}
                    </span>
                </td>

                <td>
                    <strong>
                        ${formatMoney(
                            order.price
                        )}
                    </strong>
                </td>

                <td>
                    <a
                        href="pedidos.html"
                        class="row-action"
                        title="Abrir pedidos"
                    >
                        ›
                    </a>
                </td>
            `;


            ordersTable.appendChild(
                row
            );

        }
    );

}


function renderNextDelivery() {

    const today =
        getLocalISODate();


    const futureOrders =
        orders
            .filter(
                order =>
                    order.deliveryDate &&
                    order.deliveryDate >= today &&
                    order.status !== "Entregado"
            )
            .sort(
                (a, b) =>
                    a.deliveryDate.localeCompare(
                        b.deliveryDate
                    )
            );


    if (
        futureOrders.length === 0
    ) {

        nextDelivery.textContent =
            "Sin entregas";

        nextDeliveryClient.textContent =
            "No hay entregas próximas.";

        return;

    }


    const order =
        futureOrders[0];


    nextDelivery.textContent =
        formatDate(
            order.deliveryDate
        );

    nextDeliveryClient.textContent =
        `${order.code} · ${order.clientName}`;

}


/* MODAL */

function openOrderModal() {

    orderModal.classList.add(
        "visible"
    );

    overlay.classList.add(
        "visible"
    );

    document.body.style.overflow =
        "hidden";

    setDefaultDeliveryDate();

}


function closeOrderModal() {

    orderModal.classList.remove(
        "visible"
    );

    orderForm.reset();

    balancePreview.textContent =
        "0.00";


    const tenis =
        document.querySelector(
            'input[name="itemType"][value="Tenis"]'
        );


    if (tenis) {
        tenis.checked = true;
    }


    setDefaultDeliveryDate();

    updateOverlay();

}


function calculateBalance() {

    const price =
        Math.max(
            Number(
                priceInput.value
            ) || 0,
            0
        );

    let advance =
        Math.max(
            Number(
                advanceInput.value
            ) || 0,
            0
        );


    if (
        advance > price &&
        price > 0
    ) {

        advance =
            price;

        advanceInput.value =
            price;

    }


    balancePreview.textContent =
        Math.max(
            price - advance,
            0
        ).toFixed(2);

}


/* CREAR PEDIDO */

function createOrder(event) {

    event.preventDefault();


    const data =
        new FormData(
            orderForm
        );


    const price =
        Number(
            data.get("price")
        ) || 0;


    const advance =
        Number(
            data.get("advance")
        ) || 0;


    if (
        price <= 0
    ) {

        alert(
            "El precio debe ser mayor a $0."
        );

        priceInput.focus();

        return;

    }


    if (
        advance < 0 ||
        advance > price
    ) {

        alert(
            "El anticipo no es válido."
        );

        advanceInput.focus();

        return;

    }


    const id =
        typeof crypto !== "undefined" &&
        crypto.randomUUID

            ? crypto.randomUUID()

            : `${Date.now()}-${Math.random()}`;


    const order = {

        id,

        code:
            generateOrderCode(),

        clientName:
            String(
                data.get(
                    "clientName"
                )
            ).trim(),

        phone:
            String(
                data.get(
                    "phone"
                )
            ).trim(),

        itemType:
            String(
                data.get(
                    "itemType"
                )
            ),

        brand:
            String(
                data.get(
                    "brand"
                )
            ).trim(),

        model:
            String(
                data.get(
                    "model"
                )
            ).trim(),

        color:
            String(
                data.get(
                    "color"
                )
            ).trim(),

        service:
            String(
                data.get(
                    "service"
                )
            ),

        status:
            String(
                data.get(
                    "status"
                )
            ),

        price,

        advance,

        balance:
            Math.max(
                price - advance,
                0
            ),

        paymentMethod:
            String(
                data.get(
                    "paymentMethod"
                )
            ),

        deliveryDate:
            String(
                data.get(
                    "deliveryDate"
                )
            ),

        notes:
            String(
                data.get(
                    "notes"
                )
            ).trim(),

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()

    };


    orders.unshift(
        order
    );


    saveOrders();

    renderEverything();

    closeOrderModal();


    showToast(
        `${order.code} · ${order.clientName}`
    );

}


/* SIDEBAR MÓVIL */

function openSidebar() {

    sidebar.classList.add(
        "open"
    );

    overlay.classList.add(
        "visible"
    );

}


function closeSidebar() {

    sidebar.classList.remove(
        "open"
    );

    updateOverlay();

}


function updateOverlay() {

    const modalOpen =
        orderModal.classList.contains(
            "visible"
        );

    const sidebarOpen =
        sidebar.classList.contains(
            "open"
        );


    if (
        !modalOpen &&
        !sidebarOpen
    ) {

        overlay.classList.remove(
            "visible"
        );

        document.body.style.overflow =
            "";

    }

}


/* TOAST */

function showToast(message) {

    toastMessage.textContent =
        message;

    toast.classList.add(
        "visible"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "visible"
                );

            },
            3000
        );

}


/* ENLACES FUTUROS */

document
    .querySelectorAll(
        ".future-link"
    )
    .forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    const href =
                        link.getAttribute(
                            "href"
                        );

                    const page =
                        href
                            .replace(
                                ".html",
                                ""
                            );


                    if (
                        !fileExistsInProject(
                            page
                        )
                    ) {

                        event.preventDefault();

                        alert(
                            `El módulo "${page}" todavía no está construido.`
                        );

                    }

                }
            );

        }
    );


function fileExistsInProject(page) {

    const builtPages = [
        "index",
        "pedidos"
    ];

    return builtPages.includes(
        page
    );

}


/* =====================================================
   RENDER GENERAL
===================================================== */

function renderEverything() {

    renderStats();

    renderRecentOrders();

    renderNextDelivery();

}


/* =====================================================
   EVENTOS
===================================================== */

/*
    IMPORTANTE:

    Los botones "Nuevo pedido" del Dashboard ya NO
    abren el formulario antiguo de esta página.

    Ahora son enlaces HTML hacia:

    pedidos.html?nuevo=1

    Por eso aquí ya no agregamos eventos click
    a newOrderButton ni emptyNewOrderButton.
*/


/*
    Conservamos los eventos del modal antiguo
    únicamente para evitar romper referencias
    mientras el HTML viejo siga existiendo.
*/

if (closeModalButton) {

    closeModalButton.addEventListener(
        "click",
        closeOrderModal
    );

}


if (cancelOrderButton) {

    cancelOrderButton.addEventListener(
        "click",
        closeOrderModal
    );

}


if (orderForm) {

    orderForm.addEventListener(
        "submit",
        createOrder
    );

}


if (priceInput) {

    priceInput.addEventListener(
        "input",
        calculateBalance
    );

}


if (advanceInput) {

    advanceInput.addEventListener(
        "input",
        calculateBalance
    );

}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        openSidebar
    );

}


if (overlay) {

    overlay.addEventListener(
        "click",
        () => {

            if (
                orderModal &&
                orderModal.classList.contains(
                    "visible"
                )
            ) {

                closeOrderModal();

                return;

            }


            closeSidebar();

        }
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        if (
            orderModal &&
            orderModal.classList.contains(
                "visible"
            )
        ) {

            closeOrderModal();

            return;

        }


        closeSidebar();

    }
);


/* =====================================================
   SINCRONIZACIÓN
===================================================== */

window.addEventListener(
    "pisadabacana:orders-updated",
    event => {

        if (
            !Array.isArray(
                event.detail?.orders
            )
        ) {
            return;
        }

        orders =
            event.detail.orders;

        renderEverything();

    }
);


window.addEventListener(
    "pageshow",
    () => {

        orders = loadOrders();

        renderEverything();

    }
);


/* =====================================================
   INICIO
===================================================== */

async function initialize() {

    setCurrentDate();

    /*
        Pintamos inicialmente la interfaz vacía
        mientras Firebase conecta.
    */

    renderEverything();

    try {

        /*
            firebase-bootstrap.js expone
            PisadaBacanaDB cuando Firebase está listo.
        */

        if (!window.PisadaBacanaDB) {

            await new Promise(
                (resolve, reject) => {

                    const timeout =
                        setTimeout(
                            () => {
                                reject(
                                    new Error(
                                        "Firebase tardó demasiado en iniciar."
                                    )
                                );
                            },
                            10000
                        );

                    window.addEventListener(
                        "pisadabacana:firestore-ready",
                        () => {

                            clearTimeout(
                                timeout
                            );

                            resolve();

                        },
                        {
                            once: true
                        }
                    );

                    window.addEventListener(
                        "pisadabacana:firestore-error",
                        event => {

                            clearTimeout(
                                timeout
                            );

                            reject(
                                event.detail?.error ||
                                new Error(
                                    "No se pudo iniciar Firebase."
                                )
                            );

                        },
                        {
                            once: true
                        }
                    );

                }
            );

        }

        orders =
            await getDatabase()
                .getOrders();

        renderEverything();

    } catch (error) {

        console.error(
            "Error cargando Dashboard desde Firestore:",
            error
        );

    }

}


initialize();