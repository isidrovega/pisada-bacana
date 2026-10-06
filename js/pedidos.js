"use strict";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STORAGE_KEY = "pisadaBacanaOrders";
const SETTINGS_STORAGE_KEY = "pisadaBacanaSettings";

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

let orders = loadOrders();

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
   STORAGE
===================================================== */

function loadOrders() {

    try {

        const stored =
            localStorage.getItem(STORAGE_KEY);

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


function loadSettings() {

    try {

        const stored =
            localStorage.getItem(
                SETTINGS_STORAGE_KEY
            );

        if (!stored) {
            return null;
        }

        const parsed =
            JSON.parse(stored);

        return (
            parsed &&
            typeof parsed === "object"
        )
            ? parsed
            : null;

    } catch (error) {

        console.error(
            "Error cargando ajustes:",
            error
        );

        return null;

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

        return window.crypto.randomUUID();

    }

    return (
        prefix +
        "-" +
        Date.now() +
        "-" +
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


function getSettingsServices() {

    const settings =
        loadSettings();

    if (
        settings &&
        Array.isArray(settings.services) &&
        settings.services.length
    ) {

        return settings.services
            .filter(
                service =>
                    service &&
                    service.name
            )
            .map(
                service => ({
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
                        service.type ||
                        "Ambos"
                })
            );

    }

    return DEFAULT_SERVICES;

}


function getOrderSettings() {

    const settings =
        loadSettings();

    return {

        folioPrefix:
            settings?.orders?.folioPrefix ||
            "PB",

        defaultDeliveryDays:
            Math.max(
                Number(
                    settings?.orders
                        ?.defaultDeliveryDays ?? 3
                ),
                0
            ),

        initialStatus:
            settings?.orders?.initialStatus ||
            "Recibido"

    };

}


/* =====================================================
   COMPATIBILIDAD CON PEDIDOS ANTERIORES
===================================================== */

function getOrderItems(order) {

    if (
        Array.isArray(order.items) &&
        order.items.length > 0
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


    /*
        PEDIDO VIEJO:
        convertimos virtualmente los campos
        antiguos en un artículo.
    */

    return [
        {
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
        }
    ];

}


function getOrderTotal(order) {

    if (
        Array.isArray(order.items) &&
        order.items.length > 0
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
            order.price || 0
        ),
        0
    );

}


function getOrderBalance(order) {

    const total =
        getOrderTotal(order);

    const paid =
        Math.max(
            Number(
                order.advance || 0
            ),
            0
        );

    return Math.max(
        total - paid,
        0
    );

}


/* =====================================================
   FOLIO
===================================================== */

function generateOrderCode() {

    const settings =
        getOrderSettings();

    const prefix =
        String(
            settings.folioPrefix || "PB"
        )
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            ) || "PB";


    let maxNumber = 0;


    orders.forEach(
        order => {

            const code =
                String(
                    order.code || ""
                );


            const match =
                code.match(
                    /(\d+)$/
                );


            if (!match) {
                return;
            }


            const number =
                Number(match[1]);


            if (
                Number.isFinite(number)
            ) {

                maxNumber =
                    Math.max(
                        maxNumber,
                        number
                    );

            }

        }
    );


    return (
        `${prefix}-` +
        String(
            maxNumber + 1
        ).padStart(4, "0")
    );

}


/* =====================================================
   FECHA ENTREGA
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
   NUEVOS ARTÍCULOS
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
            Number(
                firstService?.price || 0
            )
    };

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


    const hasSelected =
        services.some(
            service =>
                service.name ===
                selectedService
        );


    let available =
        [...services];


    if (
        selectedService &&
        !hasSelected
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
                    value="${escapeHTML(
                        service.name
                    )}"
                    ${
                        service.name ===
                        selectedService
                            ? "selected"
                            : ""
                    }
                    data-price="${Number(
                        service.price || 0
                    )}"
                >
                    ${escapeHTML(
                        service.name
                    )}
                </option>
            `
        )
        .join("");

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

                        <label>
                            Tipo de artículo
                        </label>

                        <div class="item-type-selector">

                            <label class="item-type-option">

                                <input
                                    type="radio"
                                    name="itemType-${escapeHTML(
                                        item.id
                                    )}"
                                    value="Tenis"
                                    ${
                                        item.itemType ===
                                        "Tenis"
                                            ? "checked"
                                            : ""
                                    }
                                >

                                <span>Tenis</span>

                            </label>


                            <label class="item-type-option">

                                <input
                                    type="radio"
                                    name="itemType-${escapeHTML(
                                        item.id
                                    )}"
                                    value="Gorra"
                                    ${
                                        item.itemType ===
                                        "Gorra"
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
                            value="${escapeHTML(
                                item.brand
                            )}"
                        >

                    </div>


                    <div class="item-field">

                        <label>Modelo</label>

                        <input
                            class="item-model"
                            type="text"
                            maxlength="80"
                            placeholder="Modelo"
                            value="${escapeHTML(
                                item.model
                            )}"
                        >

                    </div>


                    <div class="item-field">

                        <label>Color</label>

                        <input
                            class="item-color"
                            type="text"
                            maxlength="60"
                            placeholder="Color"
                            value="${escapeHTML(
                                item.color
                            )}"
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
                            value="${Number(
                                item.price || 0
                            )}"
                            placeholder="0.00"
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
                        Number(
                            first?.price || 0
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


            const selectedOption =
                event.target
                    .selectedOptions[0];


            if (selectedOption) {

                const configuredPrice =
                    Number(
                        selectedOption.dataset
                            .price || 0
                    );


                item.price =
                    configuredPrice;


                priceInput.value =
                    configuredPrice;

            }


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


/* =====================================================
   CREAR PEDIDO
===================================================== */

function createOrder(event) {

    event.preventDefault();


    if (
        newOrderItems.length === 0
    ) {

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


    const invalidItem =
        cleanItems.find(
            item =>
                !item.service
        );


    if (invalidItem) {

        showToast(
            "Todos los artículos necesitan un servicio.",
            true
        );

        return;

    }


    const total =
        cleanItems.reduce(
            (sum, item) =>
                sum + item.price,
            0
        );


    const advance =
        Math.max(
            Number(
                orderAdvance.value || 0
            ),
            0
        );


    if (
        advance > total
    ) {

        showToast(
            "El anticipo no puede ser mayor al total.",
            true
        );

        return;

    }


    const now =
        new Date().toISOString();


    const order = {

        id:
            createId("order"),

        code:
            generateOrderCode(),

        clientName:
            clientName.value.trim(),

        phone:
            clientPhone.value.trim(),

        items:
            cleanItems,

        price:
            total,

        advance:
            advance,

        balance:
            Math.max(
                total - advance,
                0
            ),

        paymentMethod:
            paymentMethod.value,

        status:
            orderStatus.value,

        deliveryDate:
            deliveryDate.value,

        notes:
            orderNotes.value.trim(),

        createdAt:
            now,

        updatedAt:
            now
    };


    /*
        Compatibilidad con módulos anteriores.
    */

    if (
        cleanItems.length > 0
    ) {

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

    }


    /*
        Guardamos el anticipo inicial como movimiento.
    */

    if (
        advance > 0
    ) {

        order.payments = [
            {
                amount:
                    advance,

                method:
                    paymentMethod.value,

                date:
                    now,

                type:
                    "Anticipo"
            }
        ];

    } else {

        order.payments = [];

    }


    /*
        Guardar pedido.
    */

    orders.unshift(order);

    saveOrders();

    closeOrderModal();

    renderEverything();


    showToast(
        `${order.code} creado con ${cleanItems.length} ${
            cleanItems.length === 1
                ? "artículo"
                : "artículos"
        }.`
    );


    /*
        Abrir automáticamente la nota.
    */

    setTimeout(
        () => {

            if (
                window.PisadaBacanaNote &&
                typeof window.PisadaBacanaNote.open ===
                    "function"
            ) {

                window.PisadaBacanaNote.open(
                    order.id
                );

            }

        },
        180
    );

}

/* =====================================================
   FILTRADO
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


            const items =
                getOrderItems(order);


            const itemText =
                items
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


            const searchable =
                normalizeText(
                    [
                        order.code,
                        order.clientName,
                        order.phone,
                        order.status,
                        itemText
                    ]
                        .filter(Boolean)
                        .join(" ")
                );


            return searchable.includes(
                search
            );

        }
    );

}


function sortOrders(list) {

    const sorted =
        [...list];


    switch (
        sortSelect.value
    ) {

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

                    return (
                        String(
                            a.deliveryDate
                        ).localeCompare(
                            String(
                                b.deliveryDate
                            )
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

            break;

    }


    return sorted;

}


/* =====================================================
   ESTADÍSTICAS
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
        active.reduce(
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

    if (
        items.length === 0
    ) {

        return "Sin artículos";

    }


    if (
        items.length === 1
    ) {

        const item =
            items[0];


        return (
            [
                item.brand,
                item.model
            ]
                .filter(Boolean)
                .join(" ") ||
            item.itemType ||
            "Artículo"
        );

    }


    const tenis =
        items.filter(
            item =>
                item.itemType ===
                "Tenis"
        ).length;


    const gorras =
        items.filter(
            item =>
                item.itemType ===
                "Gorra"
        ).length;


    const parts = [];


    if (tenis) {

        parts.push(
            `${tenis} ${
                tenis === 1
                    ? "tenis"
                    : "tenis"
            }`
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
                                            items[0]
                                                .service
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


            ordersTableBody.appendChild(
                row
            );

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


    renderDetailItems(
        order
    );


    renderDetailPayment(
        order
    );


    renderProgress(
        order.status
    );


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


    selectedOrderId = null;


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
            ]
                .filter(Boolean);


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
                                    ${escapeHTML(
                                        value
                                    )}
                                </span>
                            `
                        )
                        .join("")}

                </div>
            `;


            detailItems.appendChild(
                card
            );

        }
    );

}


function renderDetailPayment(order) {

    const total =
        getOrderTotal(order);

    const paid =
        Math.min(
            Math.max(
                Number(
                    order.advance || 0
                ),
                0
            ),
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


    /*
        "En espera" se encuentra
        entre recibido y lavado.
    */

    if (
        normalizedStatus ===
        "En espera"
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


            progressSteps.appendChild(
                element
            );

        }
    );

}


/* =====================================================
   GUARDAR CAMBIOS
===================================================== */

function saveOrderChanges() {

    const order =
        getSelectedOrder();


    if (!order) {
        return;
    }


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
        order.status ===
            "Entregado" &&
        previousStatus !==
            "Entregado"
    ) {

        order.deliveredAt =
            new Date()
                .toISOString();

    }


    saveOrders();

    renderEverything();

    closeOrderDetail();


    showToast(
        "Pedido actualizado."
    );

}


/* =====================================================
   REGISTRAR PAGO
===================================================== */

function registerPayment() {

    const order =
        getSelectedOrder();


    if (!order) {
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


    if (
        balance <= 0
    ) {

        showToast(
            "Este pedido ya está pagado.",
            true
        );

        return;

    }


    if (
        payment > balance
    ) {

        showToast(
            `El pago no puede superar ${formatMoney(
                balance
            )}.`,
            true
        );

        return;

    }


    order.advance =
        Math.max(
            Number(
                order.advance || 0
            ),
            0
        ) +
        payment;


    order.balance =
        getOrderBalance(order);


    if (
        !Array.isArray(
            order.payments
        )
    ) {

        order.payments = [];

    }


    order.payments.push({

        amount:
            payment,

        method:
            order.paymentMethod ||
            "No especificado",

        date:
            new Date()
                .toISOString(),

        type:
            "Pago"
    });


    order.updatedAt =
        new Date()
            .toISOString();


    saveOrders();

    renderEverything();

    renderDetailPayment(
        order
    );


    paymentAmount.value =
        "";


    showToast(
        "Pago registrado."
    );

}


/* =====================================================
   ELIMINAR
===================================================== */

function deleteOrder() {

    const order =
        getSelectedOrder();


    if (!order) {
        return;
    }


    const confirmed =
        window.confirm(
            `¿Eliminar ${order.code || "este pedido"}? Esta acción no se puede deshacer.`
        );


    if (!confirmed) {
        return;
    }


    orders =
        orders.filter(
            item =>
                String(item.id) !==
                String(order.id)
        );


    saveOrders();

    closeOrderDetail();

    renderEverything();


    showToast(
        "Pedido eliminado."
    );

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

    orders =
        loadOrders();


    renderStats();

    renderOrders();

}

/* =====================================================
   ABRIR FORMULARIO DESDE OTROS MÓDULOS
===================================================== */

function openRequestedNewOrder() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const requestedNewOrder =
        params.get("nuevo") === "1";


    if (!requestedNewOrder) {

        return;

    }


    /*
        Abrimos EXACTAMENTE el mismo formulario
        utilizado por el botón de pedidos.html.
    */

    openOrderModal();


    /*
        Después de abrirlo quitamos ?nuevo=1.

        Así, si el usuario actualiza la página,
        el formulario no se vuelve a abrir
        automáticamente.
    */

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
                    button.dataset.status;


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


window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
                STORAGE_KEY ||
            event.key ===
                SETTINGS_STORAGE_KEY
        ) {

            renderEverything();

        }

    }
);


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


    /*
        Si entramos desde Dashboard o Clientes con:

        pedidos.html?nuevo=1

        abrimos el formulario oficial de Pedidos.
    */

    openRequestedNewOrder();

}


initialize();

