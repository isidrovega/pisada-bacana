"use strict";

/* =====================================================
   FIRESTORE
===================================================== */

function getDatabase() {
    if (!window.PisadaBacanaDB) {
        throw new Error("Firebase todavía no está listo.");
    }

    return window.PisadaBacanaDB;
}

function waitForFirestore() {

    /*
        CASO 1:
        El bootstrap ya terminó correctamente.
    */
    if (
        window.PisadaBacanaFirebase?.ready === true
    ) {
        return Promise.resolve();
    }


    /*
        CASO 2:
        La API de base de datos ya está disponible.

        database.js ya se encarga de esperar
        ensureAnonymousSession() antes de cada
        operación contra Firestore, por lo que
        podemos continuar de forma segura.
    */
    if (
        window.PisadaBacanaDB
    ) {
        return Promise.resolve();
    }


    /*
        CASO 3:
        Ninguno está disponible todavía.
        Esperamos el bootstrap.
    */
    return new Promise(
        (resolve, reject) => {

            let finished = false;
            let timeout = null;


            function cleanup() {

                window.removeEventListener(
                    "pisadabacana:firestore-ready",
                    handleReady
                );

                window.removeEventListener(
                    "pisadabacana:firestore-error",
                    handleError
                );


                if (timeout !== null) {

                    clearTimeout(timeout);

                    timeout = null;

                }

            }


            function finishResolve() {

                if (finished) {
                    return;
                }


                finished = true;

                cleanup();

                resolve();

            }


            function finishReject(error) {

                if (finished) {
                    return;
                }


                finished = true;

                cleanup();

                reject(
                    error ||
                    new Error(
                        "No se pudo iniciar Firebase."
                    )
                );

            }


            function handleReady() {

                finishResolve();

            }


            function handleError(event) {

                finishReject(
                    event.detail?.error ||
                    new Error(
                        "Error iniciando Firebase."
                    )
                );

            }


            window.addEventListener(
                "pisadabacana:firestore-ready",
                handleReady
            );


            window.addEventListener(
                "pisadabacana:firestore-error",
                handleError
            );


            /*
                Segunda comprobación.

                Evita una condición de carrera si
                Firebase terminó exactamente mientras
                instalábamos los listeners.
            */
            if (
                window.PisadaBacanaFirebase?.ready === true ||
                window.PisadaBacanaDB
            ) {

                finishResolve();

                return;

            }


            timeout =
                setTimeout(
                    () => {

                        /*
                            Última comprobación antes
                            de declarar timeout.
                        */
                        if (
                            window.PisadaBacanaFirebase?.ready === true ||
                            window.PisadaBacanaDB
                        ) {

                            finishResolve();

                            return;

                        }


                        finishReject(
                            new Error(
                                "Firebase tardó demasiado en iniciar."
                            )
                        );

                    },
                    15000
                );

        }
    );

}


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STATUS_CLASSES = {
    "Recibido": "status-received",
    "En espera": "status-waiting",
    "Lavando": "status-washing",
    "Secando": "status-drying",
    "Listo": "status-ready",
    "Entregado": "status-delivered"
};

const PROGRESS_STATUSES = [
    "Recibido",
    "Lavando",
    "Secando",
    "Listo",
    "Entregado"
];

const DEFAULT_SERVICES = [
    {
        name: "Lavado básico",
        price: 0,
        type: "Tenis"
    },
    {
        name: "Lavado profundo",
        price: 0,
        type: "Tenis"
    },
    {
        name: "Restauración",
        price: 0,
        type: "Tenis"
    },
    {
        name: "Lavado de gorra",
        price: 0,
        type: "Gorra"
    }
];


/* =====================================================
   ESTADO
===================================================== */

let orders = [];
let appSettings = null;

let selectedOrderId = null;
let activeStatusFilter = "Todos";
let newOrderItems = [];
let toastTimer = null;


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


/* STATS */

const activeOrdersCount =
    document.getElementById("activeOrdersCount");

const processOrdersCount =
    document.getElementById("processOrdersCount");

const readyOrdersCount =
    document.getElementById("readyOrdersCount");

const pendingBalance =
    document.getElementById("pendingBalance");


/* FILTROS */

const searchInput =
    document.getElementById("searchInput");

const sortSelect =
    document.getElementById("sortSelect");

const filterButtons =
    document.querySelectorAll(".filter-button");


/* TABLA */

const ordersTableBody =
    document.getElementById("ordersTableBody");

const emptyState =
    document.getElementById("emptyState");


/* MODAL */

const orderModal =
    document.getElementById("orderModal");

const newOrderButton =
    document.getElementById("newOrderButton");

const closeOrderModalButton =
    document.getElementById("closeOrderModalButton");

const cancelOrderButton =
    document.getElementById("cancelOrderButton");

const orderForm =
    document.getElementById("orderForm");

const clientName =
    document.getElementById("clientName");

const clientPhone =
    document.getElementById("clientPhone");

const orderItems =
    document.getElementById("orderItems");

const itemsCounter =
    document.getElementById("itemsCounter");

const addItemButton =
    document.getElementById("addItemButton");

const summaryItemsCount =
    document.getElementById("summaryItemsCount");

const orderTotalPreview =
    document.getElementById("orderTotalPreview");

const orderAdvance =
    document.getElementById("orderAdvance");

const advancePreview =
    document.getElementById("advancePreview");

const balancePreview =
    document.getElementById("balancePreview");

const paymentMethod =
    document.getElementById("paymentMethod");

const orderStatus =
    document.getElementById("orderStatus");

const deliveryDate =
    document.getElementById("deliveryDate");

const orderNotes =
    document.getElementById("orderNotes");


/* DRAWER */

const orderDrawer =
    document.getElementById("orderDrawer");

const closeDrawerButton =
    document.getElementById("closeDrawerButton");

const detailOrderCode =
    document.getElementById("detailOrderCode");

const detailClientName =
    document.getElementById("detailClientName");

const detailClientPhone =
    document.getElementById("detailClientPhone");

const detailItemsCount =
    document.getElementById("detailItemsCount");

const detailItems =
    document.getElementById("detailItems");

const detailNotes =
    document.getElementById("detailNotes");

const detailStatus =
    document.getElementById("detailStatus");

const progressSteps =
    document.getElementById("progressSteps");

const detailTotal =
    document.getElementById("detailTotal");

const detailPaid =
    document.getElementById("detailPaid");

const detailBalance =
    document.getElementById("detailBalance");

const paymentAmount =
    document.getElementById("paymentAmount");

const registerPaymentButton =
    document.getElementById("registerPaymentButton");

const detailDeliveryDate =
    document.getElementById("detailDeliveryDate");

const deleteOrderButton =
    document.getElementById("deleteOrderButton");

const saveOrderChangesButton =
    document.getElementById("saveOrderChangesButton");


/* TOAST */

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");


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
    const currency =
        appSettings?.orders?.currency ||
        "MXN";

    try {
        return new Intl.NumberFormat(
            "es-MX",
            {
                style: "currency",
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ).format(
            Number(value) || 0
        );
    } catch {
        return `$${Number(value || 0).toFixed(2)}`;
    }
}


function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


function createId(prefix = "id") {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return (
        `${prefix}-${Date.now()}-` +
        Math.random()
            .toString(16)
            .slice(2)
    );
}


function getLocalISODate(date = new Date()) {
    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getDate()
        ).padStart(2, "0")
    ].join("-");
}


function formatDate(value) {
    if (!value) {
        return "Sin fecha";
    }

    const parts =
        String(value)
            .slice(0, 10)
            .split("-")
            .map(Number);

    if (parts.length !== 3) {
        return "Sin fecha";
    }

    const date =
        new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

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
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}


function setCurrentDate() {
    if (!currentDate) {
        return;
    }

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


/* =====================================================
   AJUSTES FIRESTORE
===================================================== */

function getSettingsServices() {
    const settings =
        appSettings ||
        window.PisadaBacanaData?.settings;

    if (
        settings &&
        Array.isArray(settings.services) &&
        settings.services.length
    ) {
        return settings.services
            .filter(
                service =>
                    service &&
                    String(
                        service.name || ""
                    ).trim()
            )
            .map(
                service => ({
                    id:
                        service.id ||
                        createId("service"),

                    name:
                        String(
                            service.name
                        ).trim(),

                    price:
                        Math.max(
                            Number(
                                service.price || 0
                            ),
                            0
                        ),

                    type:
                        ["Tenis", "Gorra", "Ambos"]
                            .includes(
                                service.type
                            )
                            ? service.type
                            : "Ambos"
                })
            );
    }

    return DEFAULT_SERVICES;
}


function getOrderSettings() {
    const settings =
        appSettings ||
        window.PisadaBacanaData?.settings ||
        {};

    return {
        folioPrefix:
            String(
                settings.orders
                    ?.folioPrefix ||
                "PB"
            )
                .toUpperCase()
                .replace(
                    /[^A-Z0-9]/g,
                    ""
                ) ||
            "PB",

        defaultDeliveryDays:
            Math.max(
                Number(
                    settings.orders
                        ?.defaultDeliveryDays ??
                    3
                ),
                0
            ),

        initialStatus:
            settings.orders
                ?.initialStatus ||
            "Recibido"
    };
}


/* =====================================================
   PEDIDOS / PAGOS
===================================================== */

function getOrderItems(order) {
    if (
        Array.isArray(order.items) &&
        order.items.length
    ) {
        return order.items.map(
            item => ({
                id:
                    item.id ||
                    createId("item"),

                itemType:
                    item.itemType ||
                    "Tenis",

                brand:
                    item.brand || "",

                model:
                    item.model || "",

                color:
                    item.color || "",

                service:
                    item.service ||
                    "Sin especificar",

                price:
                    Math.max(
                        Number(
                            item.price || 0
                        ),
                        0
                    )
            })
        );
    }

    return [{
        id:
            createId("legacy"),

        itemType:
            order.itemType ||
            "Tenis",

        brand:
            order.brand || "",

        model:
            order.model || "",

        color:
            order.color || "",

        service:
            order.service ||
            "Sin especificar",

        price:
            Math.max(
                Number(
                    order.price || 0
                ),
                0
            )
    }];
}


function getOrderTotal(order) {
    if (
        Array.isArray(order.items) &&
        order.items.length
    ) {
        return order.items.reduce(
            (total, item) =>
                total +
                Math.max(
                    Number(
                        item.price || 0
                    ),
                    0
                ),
            0
        );
    }

    return Math.max(
        Number(
            order.total ??
            order.price ??
            0
        ),
        0
    );
}


function getPaidAmount(order) {
    if (
        Array.isArray(order.payments)
    ) {
        return order.payments.reduce(
            (total, payment) =>
                total +
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                ),
            0
        );
    }

    return Math.max(
        Number(
            order.paid ??
            order.advance ??
            0
        ),
        0
    );
}


function getOrderBalance(order) {
    return Math.max(
        getOrderTotal(order) -
        getPaidAmount(order),
        0
    );
}


/* =====================================================
   FECHA DE ENTREGA
===================================================== */

function setDefaultDeliveryDate() {
    const settings =
        getOrderSettings();

    const date =
        new Date();

    date.setDate(
        date.getDate() +
        settings.defaultDeliveryDays
    );

    deliveryDate.value =
        getLocalISODate(date);
}


/* =====================================================
   ARTÍCULOS NUEVOS
===================================================== */

function createBlankItem() {
    const services =
        getSettingsServices();

    const firstService =
        services.find(
            service =>
                service.type === "Tenis" ||
                service.type === "Ambos"
        ) ||
        services[0];

    return {
        id:
            createId("item"),

        itemType:
            "Tenis",

        brand:
            "",

        model:
            "",

        color:
            "",

        service:
            firstService?.name || "",

        price:
            Math.max(
                Number(
                    firstService?.price || 0
                ),
                0
            )
    };
}


function getServicesForItemType(
    itemType
) {
    const services =
        getSettingsServices();

    const filtered =
        services.filter(
            service =>
                service.type === itemType ||
                service.type === "Ambos"
        );

    return filtered.length
        ? filtered
        : services;
}


function buildServiceOptions(
    itemType,
    selectedService
) {
    const services =
        getServicesForItemType(
            itemType
        );

    let available =
        [...services];

    if (
        selectedService &&
        !available.some(
            service =>
                service.name ===
                selectedService
        )
    ) {
        available.unshift({
            name:
                selectedService,

            price:
                0,

            type:
                itemType
        });
    }

    return available
        .map(
            service => `
                <option
                    value="${escapeHTML(service.name)}"
                    data-price="${Number(service.price || 0)}"
                    ${
                        service.name ===
                        selectedService
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHTML(service.name)}
                </option>
            `
        )
        .join("");
}


function addNewOrderItem() {
    newOrderItems.push(
        createBlankItem()
    );

    renderNewOrderItems();
}


function removeNewOrderItem(id) {
    if (
        newOrderItems.length <= 1
    ) {
        showToast(
            "El pedido debe tener al menos un artículo.",
            true
        );

        return;
    }

    newOrderItems =
        newOrderItems.filter(
            item =>
                item.id !== id
        );

    renderNewOrderItems();
}


function renderNewOrderItems() {
    orderItems.innerHTML = "";

    newOrderItems.forEach(
        (item, index) => {
            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "order-item-card";

            card.dataset.id =
                item.id;

            card.innerHTML = `
                <div class="order-item-header">
                    <div class="order-item-title">
                        <div class="order-item-number">
                            ${index + 1}
                        </div>

                        <strong>
                            Artículo ${index + 1}
                        </strong>
                    </div>

                    <button
                        class="remove-item-button"
                        type="button"
                        title="Eliminar artículo"
                        ${
                            newOrderItems.length <= 1
                                ? "disabled"
                                : ""
                        }
                    >
                        ×
                    </button>
                </div>

                <div class="order-item-body">
                    <div class="item-field full">
                        <label>Tipo de artículo</label>

                        <div class="item-type-selector">
                            <label class="item-type-option">
                                <input
                                    type="radio"
                                    name="itemType-${escapeHTML(item.id)}"
                                    value="Tenis"
                                    ${
                                        item.itemType === "Tenis"
                                            ? "checked"
                                            : ""
                                    }
                                >
                                <span>Tenis</span>
                            </label>

                            <label class="item-type-option">
                                <input
                                    type="radio"
                                    name="itemType-${escapeHTML(item.id)}"
                                    value="Gorra"
                                    ${
                                        item.itemType === "Gorra"
                                            ? "checked"
                                            : ""
                                    }
                                >
                                <span>Gorra</span>
                            </label>
                        </div>
                    </div>

                    <div class="item-field">
                        <label>Marca</label>
                        <input
                            class="item-brand"
                            type="text"
                            maxlength="60"
                            placeholder="Nike, Adidas, New Era..."
                            value="${escapeHTML(item.brand)}"
                        >
                    </div>

                    <div class="item-field">
                        <label>Modelo</label>
                        <input
                            class="item-model"
                            type="text"
                            maxlength="80"
                            placeholder="Modelo"
                            value="${escapeHTML(item.model)}"
                        >
                    </div>

                    <div class="item-field">
                        <label>Color</label>
                        <input
                            class="item-color"
                            type="text"
                            maxlength="60"
                            placeholder="Color"
                            value="${escapeHTML(item.color)}"
                        >
                    </div>

                    <div class="item-field">
                        <label>Servicio *</label>
                        <select
                            class="item-service"
                            required
                        >
                            ${buildServiceOptions(
                                item.itemType,
                                item.service
                            )}
                        </select>
                    </div>

                    <div class="item-field full">
                        <label>Precio *</label>
                        <input
                            class="item-price"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value="${Number(item.price || 0)}"
                        >
                    </div>
                </div>
            `;

            bindNewItemEvents(
                card,
                item
            );

            orderItems.appendChild(
                card
            );
        }
    );

    updateOrderTotals();
}


function bindNewItemEvents(
    card,
    item
) {
    const typeInputs =
        card.querySelectorAll(
            'input[type="radio"]'
        );

    const brandInput =
        card.querySelector(
            ".item-brand"
        );

    const modelInput =
        card.querySelector(
            ".item-model"
        );

    const colorInput =
        card.querySelector(
            ".item-color"
        );

    const serviceSelect =
        card.querySelector(
            ".item-service"
        );

    const priceInput =
        card.querySelector(
            ".item-price"
        );

    const removeButton =
        card.querySelector(
            ".remove-item-button"
        );

    typeInputs.forEach(
        input => {
            input.addEventListener(
                "change",
                event => {
                    item.itemType =
                        event.target.value;

                    const services =
                        getServicesForItemType(
                            item.itemType
                        );

                    const first =
                        services[0];

                    item.service =
                        first?.name || "";

                    item.price =
                        Math.max(
                            Number(
                                first?.price || 0
                            ),
                            0
                        );

                    renderNewOrderItems();
                }
            );
        }
    );

    brandInput.addEventListener(
        "input",
        event => {
            item.brand =
                event.target.value;
        }
    );

    modelInput.addEventListener(
        "input",
        event => {
            item.model =
                event.target.value;
        }
    );

    colorInput.addEventListener(
        "input",
        event => {
            item.color =
                event.target.value;
        }
    );

    serviceSelect.addEventListener(
        "change",
        event => {
            item.service =
                event.target.value;

            const option =
                event.target
                    .selectedOptions[0];

            const configuredPrice =
                Math.max(
                    Number(
                        option?.dataset
                            ?.price || 0
                    ),
                    0
                );

            item.price =
                configuredPrice;

            priceInput.value =
                configuredPrice;

            updateOrderTotals();
        }
    );

    priceInput.addEventListener(
        "input",
        event => {
            item.price =
                Math.max(
                    Number(
                        event.target.value
                    ) || 0,
                    0
                );

            updateOrderTotals();
        }
    );

    removeButton.addEventListener(
        "click",
        () => {
            removeNewOrderItem(
                item.id
            );
        }
    );
}


/* =====================================================
   TOTAL NUEVO PEDIDO
===================================================== */

function getNewOrderTotal() {
    return newOrderItems.reduce(
        (total, item) =>
            total +
            Math.max(
                Number(
                    item.price || 0
                ),
                0
            ),
        0
    );
}


function updateOrderTotals() {
    const total =
        getNewOrderTotal();

    const advance =
        Math.max(
            Number(
                orderAdvance.value || 0
            ),
            0
        );

    const balance =
        Math.max(
            total - advance,
            0
        );

    const count =
        newOrderItems.length;

    itemsCounter.textContent =
        `${count} ${
            count === 1
                ? "artículo"
                : "artículos"
        }`;

    summaryItemsCount.textContent =
        count;

    orderTotalPreview.textContent =
        formatMoney(total);

    advancePreview.textContent =
        formatMoney(advance);

    balancePreview.textContent =
        formatMoney(balance);
}


/* =====================================================
   MODAL
===================================================== */

function openOrderModal() {
    orderForm.reset();

    const settings =
        getOrderSettings();

    orderStatus.value =
        settings.initialStatus;

    orderAdvance.value =
        "0";

    newOrderItems = [
        createBlankItem()
    ];

    setDefaultDeliveryDate();
    renderNewOrderItems();

    orderModal.classList.add(
        "visible"
    );

    updateOverlay();

    document.body.classList.add(
        "no-scroll"
    );

    setTimeout(
        () => {
            clientName.focus();
        },
        100
    );
}


function closeOrderModal() {
    orderModal.classList.remove(
        "visible"
    );

    newOrderItems = [];

    updateOverlay();
    updateBodyScroll();
}


function openRequestedNewOrder() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    if (
        params.get("nuevo") !== "1"
    ) {
        return;
    }

    openOrderModal();

    const cleanURL =
        window.location.pathname +
        window.location.hash;

    window.history.replaceState(
        {},
        document.title,
        cleanURL
    );
}


/* =====================================================
   CREAR PEDIDO
===================================================== */

async function createOrder(event) {
    event.preventDefault();

    if (!newOrderItems.length) {
        showToast(
            "Agrega al menos un artículo.",
            true
        );

        return;
    }

    const cleanItems =
        newOrderItems.map(
            item => ({
                id:
                    item.id ||
                    createId("item"),

                itemType:
                    item.itemType === "Gorra"
                        ? "Gorra"
                        : "Tenis",

                brand:
                    String(
                        item.brand || ""
                    ).trim(),

                model:
                    String(
                        item.model || ""
                    ).trim(),

                color:
                    String(
                        item.color || ""
                    ).trim(),

                service:
                    String(
                        item.service || ""
                    ).trim(),

                price:
                    Math.max(
                        Number(
                            item.price || 0
                        ),
                        0
                    )
            })
        );

    if (
        cleanItems.some(
            item =>
                !item.service
        )
    ) {
        showToast(
            "Todos los artículos necesitan un servicio.",
            true
        );

        return;
    }

    const total =
        cleanItems.reduce(
            (sum, item) =>
                sum +
                item.price,
            0
        );

    const advance =
        Math.max(
            Number(
                orderAdvance.value || 0
            ),
            0
        );

    if (advance > total) {
        showToast(
            "El anticipo no puede ser mayor al total.",
            true
        );

        return;
    }

    try {
        const database =
            getDatabase();

        const orderSettings =
            getOrderSettings();

        const code =
            await database
                .getNextOrderCode(
                    orderSettings.folioPrefix
                );

        const now =
            new Date()
                .toISOString();

        const payments =
            advance > 0
                ? [{
                    id:
                        createId("payment"),

                    amount:
                        advance,

                    method:
                        paymentMethod.value ||
                        "Efectivo",

                    type:
                        "Anticipo",

                    date:
                        now
                }]
                : [];

        const order = {
            id:
                createId("order"),

            code,

            clientName:
                clientName.value
                    .trim(),

            phone:
                clientPhone.value
                    .trim(),

            items:
                cleanItems,

            total,
            price:
                total,

            payments,

            paid:
                advance,

            advance:
                advance,

            balance:
                Math.max(
                    total - advance,
                    0
                ),

            paymentMethod:
                paymentMethod.value ||
                "Efectivo",

            status:
                orderStatus.value ||
                orderSettings.initialStatus,

            deliveryDate:
                deliveryDate.value,

            notes:
                orderNotes.value
                    .trim(),

            createdAt:
                now,

            updatedAt:
                now
        };

        order.itemType =
            cleanItems[0].itemType;

        order.brand =
            cleanItems[0].brand;

        order.model =
            cleanItems[0].model;

        order.color =
            cleanItems[0].color;

        order.service =
            cleanItems.length === 1
                ? cleanItems[0].service
                : `${cleanItems.length} artículos`;

        await database.saveOrder(
            order
        );

        orders =
            await database.getOrders();

        closeOrderModal();
        renderEverything();

        showToast(
            `${code} creado con ${cleanItems.length} ${
                cleanItems.length === 1
                    ? "artículo"
                    : "artículos"
            }.`
        );

        setTimeout(
            () => {
                if (
                    window.PisadaBacanaNote &&
                    typeof window
                        .PisadaBacanaNote
                        .open === "function"
                ) {
                    window
                        .PisadaBacanaNote
                        .open(order.id);
                }
            },
            180
        );

    } catch (error) {
        console.error(
            "Error creando pedido:",
            error
        );

        showToast(
            "No se pudo guardar el pedido en Firebase.",
            true
        );
    }
}


/* =====================================================
   FILTROS
===================================================== */

function getFilteredOrders() {
    const search =
        normalizeText(
            searchInput.value
        );

    return orders.filter(
        order => {
            const statusMatches =
                activeStatusFilter ===
                    "Todos" ||
                order.status ===
                    activeStatusFilter;

            if (!statusMatches) {
                return false;
            }

            if (!search) {
                return true;
            }

            const itemText =
                getOrderItems(order)
                    .map(
                        item => [
                            item.itemType,
                            item.brand,
                            item.model,
                            item.color,
                            item.service
                        ]
                            .filter(Boolean)
                            .join(" ")
                    )
                    .join(" ");

            return normalizeText(
                [
                    order.code,
                    order.clientName,
                    order.phone,
                    order.status,
                    itemText
                ]
                    .filter(Boolean)
                    .join(" ")
            ).includes(search);
        }
    );
}


function sortOrders(list) {
    const sorted =
        [...list];

    switch (sortSelect.value) {
        case "oldest":
            sorted.sort(
                (a, b) =>
                    new Date(
                        a.createdAt || 0
                    ) -
                    new Date(
                        b.createdAt || 0
                    )
            );
            break;

        case "delivery":
            sorted.sort(
                (a, b) => {
                    if (
                        !a.deliveryDate &&
                        !b.deliveryDate
                    ) {
                        return 0;
                    }

                    if (!a.deliveryDate) {
                        return 1;
                    }

                    if (!b.deliveryDate) {
                        return -1;
                    }

                    return String(
                        a.deliveryDate
                    ).localeCompare(
                        String(
                            b.deliveryDate
                        )
                    );
                }
            );
            break;

        case "price":
            sorted.sort(
                (a, b) =>
                    getOrderTotal(b) -
                    getOrderTotal(a)
            );
            break;

        case "newest":
        default:
            sorted.sort(
                (a, b) =>
                    new Date(
                        b.createdAt || 0
                    ) -
                    new Date(
                        a.createdAt || 0
                    )
            );
    }

    return sorted;
}


/* =====================================================
   STATS
===================================================== */

function renderStats() {
    const active =
        orders.filter(
            order =>
                order.status !==
                "Entregado"
        );

    const process =
        orders.filter(
            order =>
                order.status ===
                    "Lavando" ||
                order.status ===
                    "Secando"
        );

    const ready =
        orders.filter(
            order =>
                order.status ===
                "Listo"
        );

    const pending =
        orders.reduce(
            (total, order) =>
                total +
                getOrderBalance(order),
            0
        );

    activeOrdersCount.textContent =
        active.length;

    processOrdersCount.textContent =
        process.length;

    readyOrdersCount.textContent =
        ready.length;

    pendingBalance.textContent =
        formatMoney(pending);

    navOrderCount.textContent =
        active.length;
}


/* =====================================================
   TABLA
===================================================== */

function getItemsSummary(items) {
    const tenis =
        items.filter(
            item =>
                item.itemType !== "Gorra"
        ).length;

    const gorras =
        items.filter(
            item =>
                item.itemType === "Gorra"
        ).length;

    const parts = [];

    if (tenis) {
        parts.push(
            `${tenis} ${
                tenis === 1
                    ? "par"
                    : "pares"
            } de tenis`
        );
    }

    if (gorras) {
        parts.push(
            `${gorras} ${
                gorras === 1
                    ? "gorra"
                    : "gorras"
            }`
        );
    }

    return (
        parts.join(" · ") ||
        `${items.length} artículos`
    );
}


function renderOrders() {
    ordersTableBody.innerHTML =
        "";

    const filtered =
        sortOrders(
            getFilteredOrders()
        );

    if (!filtered.length) {
        emptyState.classList.add(
            "visible"
        );

        return;
    }

    emptyState.classList.remove(
        "visible"
    );

    filtered.forEach(
        order => {
            const items =
                getOrderItems(order);

            const total =
                getOrderTotal(order);

            const balance =
                getOrderBalance(order);

            const statusClass =
                STATUS_CLASSES[
                    order.status
                ] ||
                "status-received";

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>
                    <span class="order-code">
                        ${escapeHTML(
                            order.code ||
                            "Sin folio"
                        )}
                    </span>
                </td>

                <td>
                    <span class="cell-main">
                        ${escapeHTML(
                            order.clientName ||
                            "Sin cliente"
                        )}
                    </span>

                    <span class="cell-sub">
                        ${escapeHTML(
                            order.phone || ""
                        )}
                    </span>
                </td>

                <td class="items-cell">
                    <div class="items-summary">
                        <span class="item-count-badge">
                            ${items.length}
                        </span>

                        <div>
                            <span class="cell-main">
                                ${escapeHTML(
                                    getItemsSummary(
                                        items
                                    )
                                )}
                            </span>

                            <span class="cell-sub">
                                ${
                                    items.length === 1
                                        ? escapeHTML(
                                            items[0].service
                                        )
                                        : `${items.length} artículos en el pedido`
                                }
                            </span>
                        </div>
                    </div>
                </td>

                <td>
                    <span
                        class="status-pill ${statusClass}"
                    >
                        ${escapeHTML(
                            order.status ||
                            "Recibido"
                        )}
                    </span>
                </td>

                <td>
                    <span
                        class="payment-pill ${
                            balance <= 0
                                ? "payment-paid"
                                : "payment-pending"
                        }"
                    >
                        ${
                            balance <= 0
                                ? "Pagado"
                                : formatMoney(
                                    balance
                                )
                        }
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        formatDate(
                            order.deliveryDate
                        )
                    )}
                </td>

                <td>
                    <strong>
                        ${formatMoney(total)}
                    </strong>
                </td>

                <td>
                    <button
                        class="action-button"
                        type="button"
                        data-order-id="${escapeHTML(
                            order.id
                        )}"
                        title="Ver pedido"
                    >
                        ›
                    </button>
                </td>
            `;

            ordersTableBody
                .appendChild(row);
        }
    );

    ordersTableBody
        .querySelectorAll(
            ".action-button"
        )
        .forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        openOrderDetail(
                            button.dataset
                                .orderId
                        );
                    }
                );
            }
        );
}


/* =====================================================
   DETALLE
===================================================== */

function getSelectedOrder() {
    return orders.find(
        order =>
            String(order.id) ===
            String(selectedOrderId)
    ) || null;
}


function openOrderDetail(orderId) {
    selectedOrderId =
        orderId;

    const order =
        getSelectedOrder();

    if (!order) {
        selectedOrderId =
            null;
        return;
    }

    detailOrderCode.textContent =
        order.code ||
        "Sin folio";

    detailClientName.textContent =
        order.clientName ||
        "Sin cliente";

    detailClientPhone.textContent =
        order.phone ||
        "Sin teléfono";

    detailNotes.textContent =
        order.notes ||
        "Sin observaciones.";

    detailStatus.value =
        order.status ||
        "Recibido";

    detailDeliveryDate.value =
        order.deliveryDate || "";

    paymentAmount.value =
        "";

    renderDetailItems(order);
    renderDetailPayment(order);
    renderProgress(order.status);

    orderDrawer.classList.add(
        "visible"
    );

    updateOverlay();

    document.body.classList.add(
        "no-scroll"
    );
}


function closeOrderDetail() {
    orderDrawer.classList.remove(
        "visible"
    );

    selectedOrderId =
        null;

    updateOverlay();
    updateBodyScroll();
}


function renderDetailItems(order) {
    const items =
        getOrderItems(order);

    detailItemsCount.textContent =
        items.length;

    detailItems.innerHTML =
        "";

    items.forEach(
        (item, index) => {
            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "detail-item";

            const name =
                [
                    item.brand,
                    item.model
                ]
                    .filter(Boolean)
                    .join(" ") ||
                item.itemType ||
                `Artículo ${index + 1}`;

            const meta = [
                item.itemType,
                item.color,
                item.service
            ].filter(Boolean);

            card.innerHTML = `
                <div class="detail-item-top">
                    <div class="detail-item-title">
                        <strong>
                            ${index + 1}.
                            ${escapeHTML(name)}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.service ||
                                "Sin servicio"
                            )}
                        </span>
                    </div>

                    <span class="detail-item-price">
                        ${formatMoney(
                            item.price
                        )}
                    </span>
                </div>

                <div class="detail-item-meta">
                    ${meta
                        .map(
                            value => `
                                <span>
                                    ${escapeHTML(value)}
                                </span>
                            `
                        )
                        .join("")}
                </div>
            `;

            detailItems
                .appendChild(card);
        }
    );
}


function renderDetailPayment(order) {
    const total =
        getOrderTotal(order);

    const paid =
        Math.min(
            getPaidAmount(order),
            total
        );

    const balance =
        Math.max(
            total - paid,
            0
        );

    detailTotal.textContent =
        formatMoney(total);

    detailPaid.textContent =
        formatMoney(paid);

    detailBalance.textContent =
        formatMoney(balance);
}


/* =====================================================
   PROGRESO
===================================================== */

function renderProgress(status) {
    progressSteps.innerHTML =
        "";

    let normalizedStatus =
        status;

    if (
        normalizedStatus ===
        "En espera"
    ) {
        normalizedStatus =
            "Recibido";
    }

    if (
        !PROGRESS_STATUSES.includes(
            normalizedStatus
        )
    ) {
        normalizedStatus =
            "Recibido";
    }

    const currentIndex =
        PROGRESS_STATUSES.indexOf(
            normalizedStatus
        );

    PROGRESS_STATUSES.forEach(
        (step, index) => {
            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "progress-step";

            if (
                index < currentIndex
            ) {
                element.classList.add(
                    "completed"
                );
            }

            if (
                index === currentIndex
            ) {
                element.classList.add(
                    "current"
                );
            }

            element.innerHTML = `
                <div class="progress-dot"></div>
                <span>${escapeHTML(step)}</span>
            `;

            progressSteps
                .appendChild(element);
        }
    );
}


/* =====================================================
   GUARDAR CAMBIOS
===================================================== */

async function saveOrderChanges() {
    const order =
        getSelectedOrder();

    if (!order) {
        showToast(
            "No se encontró el pedido.",
            true
        );

        return;
    }

    try {
        const previousStatus =
            order.status;

        order.status =
            detailStatus.value;

        order.deliveryDate =
            detailDeliveryDate.value;

        order.updatedAt =
            new Date()
                .toISOString();

        if (
            order.status === "Entregado" &&
            previousStatus !== "Entregado"
        ) {
            order.deliveredAt =
                new Date()
                    .toISOString();
        }

        if (
            order.status !== "Entregado"
        ) {
            delete order.deliveredAt;
        }

        await getDatabase()
            .saveOrder(order);

        orders =
            await getDatabase()
                .getOrders();

        renderEverything();
        closeOrderDetail();

        showToast(
            "Pedido actualizado."
        );

    } catch (error) {
        console.error(
            "Error actualizando pedido:",
            error
        );

        showToast(
            "No se pudieron guardar los cambios.",
            true
        );
    }
}


/* =====================================================
   REGISTRAR PAGO
===================================================== */

async function registerPayment() {
    const order =
        getSelectedOrder();

    if (!order) {
        showToast(
            "No se encontró el pedido.",
            true
        );

        return;
    }

    const payment =
        Number(
            paymentAmount.value
        );

    if (
        !Number.isFinite(payment) ||
        payment <= 0
    ) {
        showToast(
            "Ingresa un pago válido.",
            true
        );

        return;
    }

    const balance =
        getOrderBalance(order);

    if (balance <= 0) {
        showToast(
            "Este pedido ya está pagado.",
            true
        );

        return;
    }

    if (
        payment >
        balance + 0.005
    ) {
        showToast(
            `El pago no puede superar ${formatMoney(
                balance
            )}.`,
            true
        );

        return;
    }

    try {
        const now =
            new Date()
                .toISOString();

        if (
            !Array.isArray(
                order.payments
            )
        ) {
            order.payments = [];
        }

        order.payments.push({
            id:
                createId("payment"),

            amount:
                payment,

            method:
                order.paymentMethod ||
                "Efectivo",

            type:
                "Pago",

            date:
                now
        });

        const paid =
            getPaidAmount(order);

        order.paid =
            paid;

        /*
            Se mantiene únicamente por compatibilidad
            con registros/módulos históricos.
        */
        order.advance =
            paid;

        order.balance =
            Math.max(
                getOrderTotal(order) -
                paid,
                0
            );

        order.updatedAt =
            now;

        await getDatabase()
            .saveOrder(order);

        orders =
            await getDatabase()
                .getOrders();

        paymentAmount.value =
            "";

        renderEverything();

        /*
            Conservamos el ID antes de volver
            a dibujar el drawer.
        */
        const orderId =
            order.id;

        openOrderDetail(
            orderId
        );

        showToast(
            `Pago de ${formatMoney(
                payment
            )} registrado.`
        );

    } catch (error) {
        console.error(
            "Error registrando pago:",
            error
        );

        showToast(
            "No se pudo registrar el pago.",
            true
        );
    }
}


/* =====================================================
   ELIMINAR
===================================================== */

async function deleteOrder() {
    const order =
        getSelectedOrder();

    if (!order) {
        showToast(
            "No se encontró el pedido.",
            true
        );

        return;
    }

    const confirmed =
        window.confirm(
            `¿Eliminar definitivamente ${order.code}?`
        );

    if (!confirmed) {
        return;
    }

    try {
        await getDatabase()
            .deleteOrder(
                order.id
            );

        orders =
            await getDatabase()
                .getOrders();

        closeOrderDetail();
        renderEverything();

        showToast(
            `${order.code} eliminado.`
        );

    } catch (error) {
        console.error(
            "Error eliminando pedido:",
            error
        );

        showToast(
            "No se pudo eliminar el pedido.",
            true
        );
    }
}


/* =====================================================
   SIDEBAR / OVERLAY
===================================================== */

function openSidebar() {
    sidebar.classList.add(
        "open"
    );

    updateOverlay();

    document.body.classList.add(
        "no-scroll"
    );
}


function closeSidebar() {
    sidebar.classList.remove(
        "open"
    );

    updateOverlay();
    updateBodyScroll();
}


function updateOverlay() {
    const visible =
        sidebar.classList.contains(
            "open"
        ) ||
        orderModal.classList.contains(
            "visible"
        ) ||
        orderDrawer.classList.contains(
            "visible"
        );

    overlay.classList.toggle(
        "visible",
        visible
    );
}


function updateBodyScroll() {
    const shouldLock =
        sidebar.classList.contains(
            "open"
        ) ||
        orderModal.classList.contains(
            "visible"
        ) ||
        orderDrawer.classList.contains(
            "visible"
        );

    document.body.classList.toggle(
        "no-scroll",
        shouldLock
    );
}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message,
    isError = false
) {
    if (toastTimer) {
        clearTimeout(
            toastTimer
        );
    }

    toastMessage.textContent =
        message;

    toast.classList.toggle(
        "error",
        isError
    );

    toast.classList.add(
        "visible"
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


/* =====================================================
   RENDER GENERAL
===================================================== */

function renderEverything() {
    renderStats();
    renderOrders();
}


/* =====================================================
   EVENTOS
===================================================== */

newOrderButton.addEventListener(
    "click",
    openOrderModal
);

closeOrderModalButton.addEventListener(
    "click",
    closeOrderModal
);

cancelOrderButton.addEventListener(
    "click",
    closeOrderModal
);

orderForm.addEventListener(
    "submit",
    createOrder
);

addItemButton.addEventListener(
    "click",
    addNewOrderItem
);

orderAdvance.addEventListener(
    "input",
    updateOrderTotals
);

searchInput.addEventListener(
    "input",
    renderOrders
);

sortSelect.addEventListener(
    "change",
    renderOrders
);

filterButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            () => {
                activeStatusFilter =
                    button.dataset.status ||
                    "Todos";

                filterButtons.forEach(
                    item => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );

                button.classList.add(
                    "active"
                );

                renderOrders();
            }
        );
    }
);

closeDrawerButton.addEventListener(
    "click",
    closeOrderDetail
);

detailStatus.addEventListener(
    "change",
    () => {
        renderProgress(
            detailStatus.value
        );
    }
);

saveOrderChangesButton.addEventListener(
    "click",
    saveOrderChanges
);

registerPaymentButton.addEventListener(
    "click",
    registerPayment
);

paymentAmount.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter"
        ) {
            event.preventDefault();
            registerPayment();
        }
    }
);

deleteOrderButton.addEventListener(
    "click",
    deleteOrder
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
    () => {
        if (
            orderModal.classList.contains(
                "visible"
            )
        ) {
            closeOrderModal();
            return;
        }

        if (
            orderDrawer.classList.contains(
                "visible"
            )
        ) {
            closeOrderDetail();
            return;
        }

        closeSidebar();
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key !== "Escape"
        ) {
            return;
        }

        if (
            orderModal.classList.contains(
                "visible"
            )
        ) {
            closeOrderModal();
            return;
        }

        if (
            orderDrawer.classList.contains(
                "visible"
            )
        ) {
            closeOrderDetail();
            return;
        }

        closeSidebar();
    }
);


/* =====================================================
   FIRESTORE EN TIEMPO REAL
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

        if (
            selectedOrderId &&
            getSelectedOrder()
        ) {
            openOrderDetail(
                selectedOrderId
            );
        }
    }
);


window.addEventListener(
    "pisadabacana:settings-updated",
    event => {
        appSettings =
            event.detail?.settings ||
            null;

        if (
            newOrderItems.length &&
            orderModal.classList.contains(
                "visible"
            )
        ) {
            /*
                Conservamos la selección actual.
                Sólo redibujamos las opciones/precios.
            */
            renderNewOrderItems();
        }
    }
);


/* =====================================================
   INICIO
===================================================== */

async function initialize() {
    setCurrentDate();
    renderEverything();

    try {
        await waitForFirestore();

        const database =
            getDatabase();

        [
            orders,
            appSettings
        ] =
            await Promise.all([
                database.getOrders(),
                database.getSettings()
            ]);

        renderEverything();

        /*
            Se ejecuta DESPUÉS de cargar settings.
        */
        openRequestedNewOrder();

    } catch (error) {
        console.error(
            "No se pudo iniciar Pedidos con Firestore:",
            error
        );

        showToast(
    `Firebase: ${error?.code || "sin código"} - ${error?.message || "Error desconocido"}`,
    true
);
    }
}

/* =====================================================
   ABRIR DETALLE AL HACER CLIC EN TODA LA FILA
===================================================== */

function enableOrderRowClick() {
    const table = document.querySelector(".orders-panel table");

    if (!table) return;

    table.addEventListener("click", (event) => {
        const row = event.target.closest("tbody tr");

        if (!row) return;

        // Evita duplicar acciones de botones o enlaces.
        if (
            event.target.closest(
                "button, a, input, select, textarea"
            )
        ) {
            return;
        }

        // Reutiliza el botón existente que abre el detalle.
        const detailButton = row.querySelector(
            ".table-action, .view-button"
        );

        if (detailButton) {
            detailButton.click();
        }
    });
}

enableOrderRowClick();


initialize();