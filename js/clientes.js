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

let orders = [];
let clients = [];
let currentFilter = "Todos";
let selectedClientKey = null;


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


const totalClients =
    document.getElementById("totalClients");

const activeClients =
    document.getElementById("activeClients");

const repeatClients =
    document.getElementById("repeatClients");

const clientRevenue =
    document.getElementById("clientRevenue");


const searchInput =
    document.getElementById("searchInput");

const sortSelect =
    document.getElementById("sortSelect");

const filters =
    document.getElementById("filters");

const resultCount =
    document.getElementById("resultCount");

const resultDescription =
    document.getElementById("resultDescription");


const clientsTable =
    document.getElementById("clientsTable");

const emptyState =
    document.getElementById("emptyState");


const clientDrawer =
    document.getElementById("clientDrawer");

const closeDrawerButton =
    document.getElementById("closeDrawerButton");

const detailClientName =
    document.getElementById("detailClientName");

const detailPhone =
    document.getElementById("detailPhone");

const detailClientSince =
    document.getElementById("detailClientSince");

const detailOrdersCount =
    document.getElementById("detailOrdersCount");

const detailActiveOrders =
    document.getElementById("detailActiveOrders");

const detailSpent =
    document.getElementById("detailSpent");

const detailPending =
    document.getElementById("detailPending");

const historyList =
    document.getElementById("historyList");





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


function formatDateFromISO(value) {

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
            year: "numeric"
        }
    ).format(date);

}


function formatDeliveryDate(value) {

    if (!value) {
        return "Sin fecha";
    }

    const parts =
        value
            .split("-")
            .map(Number);

    if (
        parts.length !== 3
    ) {
        return value;
    }

    const date =
        new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
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


function normalizePhone(phone) {

    return String(phone || "")
        .replace(/\D/g, "");

}


function normalizeText(text) {

    return String(text || "")
        .trim()
        .toLowerCase();

}


function getClientKey(order) {

    const phone =
        normalizePhone(
            order.phone
        );

    if (phone) {
        return `phone:${phone}`;
    }

    return `name:${normalizeText(
        order.clientName
    )}`;

}


function getOrderBalance(order) {

    const total =
        Math.max(
            Number(
                order.price || 0
            ),
            0
        );

    const paid =
        Math.max(
            Number(
                order.paid ??
                order.advance ??
                0
            ),
            0
        );

    return Math.max(
        total - paid,
        0
    );

}


function getInitials(name) {

    const parts =
        String(name || "Cliente")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (
        parts.length === 0
    ) {
        return "CL";
    }

    const first =
        parts[0][0] || "";

    const second =
        parts.length > 1
            ? parts[1][0]
            : "";

    return (
        first + second
    ).toUpperCase();

}


/* CREAR CLIENTES A PARTIR DE PEDIDOS */

function buildClients() {

    const map =
        new Map();


    orders.forEach(
        order => {

            const key =
                getClientKey(order);


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {
                        key,
                        name:
                            order.clientName ||
                            "Cliente sin nombre",

                        phone:
                            order.phone ||
                            "Sin teléfono",

                        orders: []
                    }
                );

            }


            const client =
                map.get(key);


            if (
                order.clientName
            ) {

                client.name =
                    order.clientName;

            }


            if (
                order.phone
            ) {

                client.phone =
                    order.phone;

            }


            client.orders.push(
                order
            );

        }
    );


    clients =
        Array.from(
            map.values()
        )
        .map(
            client => {

                const sortedOrders =
                    [...client.orders]
                        .sort(
                            (a, b) =>
                                new Date(
                                    b.createdAt || 0
                                ) -
                                new Date(
                                    a.createdAt || 0
                                )
                        );


                const activeOrders =
                    sortedOrders.filter(
                        order =>
                            order.status !==
                            "Entregado"
                    );


                const totalSpent =
    sortedOrders.reduce(
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


                const totalPending =
                    sortedOrders.reduce(
                        (total, order) =>
                            total +
                            getOrderBalance(order),
                        0
                    );


                const firstOrder =
                    [...sortedOrders]
                        .sort(
                            (a, b) =>
                                new Date(
                                    a.createdAt || 0
                                ) -
                                new Date(
                                    b.createdAt || 0
                                )
                        )[0];


                return {
                    ...client,

                    orders:
                        sortedOrders,

                    ordersCount:
                        sortedOrders.length,

                    activeCount:
                        activeOrders.length,

                    totalSpent,

                    totalPending,

                    lastOrder:
                        sortedOrders[0] || null,

                    firstOrder:
                        firstOrder || null
                };

            }
        );

}


/* STATS */

function renderStats() {

    const active =
        clients.filter(
            client =>
                client.activeCount > 0
        );

    const repeat =
        clients.filter(
            client =>
                client.ordersCount > 1
        );

    const revenue =
        clients.reduce(
            (total, client) =>
                total +
                client.totalSpent,
            0
        );


    totalClients.textContent =
        clients.length;

    activeClients.textContent =
        active.length;

    repeatClients.textContent =
        repeat.length;

    clientRevenue.textContent =
        formatMoney(revenue);


    const activeOrdersCount =
        orders.filter(
            order =>
                order.status !== "Entregado"
        ).length;


    navOrderCount.textContent =
        activeOrdersCount;

}


/* FILTROS */

function getFilteredClients() {

    const search =
        normalizeText(
            searchInput.value
        );


    let filtered =
        clients.filter(
            client => {

                const searchable = [
                    client.name,
                    client.phone,
                    ...client.orders.map(
                        order =>
                            order.code
                    )
                ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                let matchesFilter =
                    true;


                if (
                    currentFilter ===
                    "Activos"
                ) {

                    matchesFilter =
                        client.activeCount > 0;

                }


                if (
                    currentFilter ===
                    "Recurrentes"
                ) {

                    matchesFilter =
                        client.ordersCount > 1;

                }


                if (
                    currentFilter ===
                    "Sin pendientes"
                ) {

                    matchesFilter =
                        client.totalPending <= 0;

                }


                return (
                    matchesSearch &&
                    matchesFilter
                );

            }
        );


    filtered =
        sortClients(
            filtered
        );


    return filtered;

}


function sortClients(list) {

    const sorted =
        [...list];

    const option =
        sortSelect.value;


    if (
        option === "name"
    ) {

        sorted.sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name,
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
        );

    } else if (
        option === "orders"
    ) {

        sorted.sort(
            (a, b) =>
                b.ordersCount -
                a.ordersCount
        );

    } else if (
        option === "spent"
    ) {

        sorted.sort(
            (a, b) =>
                b.totalSpent -
                a.totalSpent
        );

    } else {

        sorted.sort(
            (a, b) =>
                new Date(
                    b.lastOrder?.createdAt || 0
                ) -
                new Date(
                    a.lastOrder?.createdAt || 0
                )
        );

    }


    return sorted;

}


/* TABLA */

function renderClients() {

    const filtered =
        getFilteredClients();


    clientsTable.innerHTML = "";


    resultCount.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? "cliente"
                : "clientes"
        }`;


    if (
        currentFilter === "Todos"
    ) {

        resultDescription.textContent =
            "Mostrando todos los clientes";

    } else {

        resultDescription.textContent =
            `Filtro: ${currentFilter}`;

    }


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
        client => {

            const row =
                document.createElement(
                    "tr"
                );

                row.classList.add("clickable-client-row");

row.style.cursor = "pointer";

row.tabIndex = 0;

row.setAttribute("role", "button");

row.setAttribute(
    "aria-label",
    `Ver detalles de ${client.name}`
);


            const activeBadge =
                client.activeCount > 0

                    ? `
                        <span class="badge badge-active">
                            ${client.activeCount} activos
                        </span>
                    `

                    : `
                        <span class="badge badge-neutral">
                            Sin activos
                        </span>
                    `;


            const pendingBadge =
                client.totalPending > 0

                    ? `
                        <span class="badge badge-pending">
                            ${formatMoney(
                                client.totalPending
                            )}
                        </span>
                    `

                    : `
                        <span class="badge badge-neutral">
                            Sin saldo
                        </span>
                    `;


            const lastOrder =
                client.lastOrder;


            const lastService =
                lastOrder
                    ? lastOrder.service
                    : "Sin pedidos";


            const lastArticle =
                lastOrder

                    ? [
                        lastOrder.brand,
                        lastOrder.model
                    ]
                        .filter(Boolean)
                        .join(" ")

                    : "";


            row.innerHTML = `
                <td>

                    <div class="client-cell">

                        <div class="client-avatar">
                            ${escapeHTML(
                                getInitials(
                                    client.name
                                )
                            )}
                        </div>

                        <div>

                            <span class="cell-main">
                                ${escapeHTML(
                                    client.name
                                )}
                            </span>

                            <span class="cell-sub">
                                ${
                                    client.ordersCount > 1
                                        ? "Cliente recurrente"
                                        : "Cliente"
                                }
                            </span>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(
                        client.phone
                    )}
                </td>


                <td>
                    <strong>
                        ${client.ordersCount}
                    </strong>
                </td>


                <td>
                    ${activeBadge}
                </td>


                <td>

                    <span class="cell-main">
                        ${escapeHTML(
                            lastService
                        )}
                    </span>

                    <span class="cell-sub">
                        ${escapeHTML(
                            lastArticle
                        )}
                    </span>

                </td>


                <td>
                    <strong>
                        ${formatMoney(
                            client.totalSpent
                        )}
                    </strong>
                </td>


                <td>
                    ${pendingBadge}
                </td>


                <td>

                    <button
                        class="row-action"
                        data-client-key="${escapeHTML(
                            client.key
                        )}"
                        title="Abrir cliente"
                    >
                        ›
                    </button>

                </td>
            `;


            clientsTable.appendChild(
                row
            );

        }
    );

}


/* DRAWER */

function openClientDetail(
    clientKey
) {

    const client =
        clients.find(
            item =>
                item.key === clientKey
        );


    if (!client) {
        return;
    }


    selectedClientKey =
        client.key;


    detailClientName.textContent =
        client.name;


    detailPhone.textContent =
        client.phone;


    detailClientSince.textContent =
        client.firstOrder

            ? `Cliente desde ${formatDateFromISO(
                client.firstOrder.createdAt
            )}`

            : "Cliente registrado";


    detailOrdersCount.textContent =
        client.ordersCount;


    detailActiveOrders.textContent =
        client.activeCount;


    detailSpent.textContent =
        formatMoney(
            client.totalSpent
        );


    detailPending.textContent =
        formatMoney(
            client.totalPending
        );


    renderClientHistory(
        client
    );


    clientDrawer.classList.add(
        "visible"
    );


    overlay.classList.add(
        "visible"
    );


    document.body.style.overflow =
        "hidden";

}


function closeClientDetail() {

    clientDrawer.classList.remove(
        "visible"
    );

    selectedClientKey =
        null;

    updateOverlay();

}


/* HISTORIAL */

function renderClientHistory(
    client
) {

    historyList.innerHTML = "";


    if (
        client.orders.length === 0
    ) {

        historyList.innerHTML = `
            <p>
                Este cliente todavía no tiene pedidos.
            </p>
        `;

        return;

    }


    client.orders.forEach(
        order => {

            const card =
                document.createElement(
                    "article"
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


            const balance =
                getOrderBalance(order);


            card.className =
                "history-card";


            card.innerHTML = `
                <div class="history-card-header">

                    <strong>
                        ${escapeHTML(
                            order.code
                        )}
                    </strong>

                    <span>
                        ${formatDateFromISO(
                            order.createdAt
                        )}
                    </span>

                </div>


                <h4>
                    ${escapeHTML(
                        article
                    )}
                </h4>


                <p>
                    ${escapeHTML(
                        order.service ||
                        "Sin servicio"
                    )}
                    ·
                    ${escapeHTML(
                        order.status ||
                        "Sin estado"
                    )}
                </p>


                <div class="history-card-footer">

                    <span>
                        Entrega:
                        ${formatDeliveryDate(
                            order.deliveryDate
                        )}
                    </span>

                    <strong>
                        ${formatMoney(
                            order.price
                        )}
                    </strong>

                </div>


                ${
                    balance > 0

                        ? `
                            <p>
                                Saldo pendiente:
                                ${formatMoney(balance)}
                            </p>
                        `

                        : ""
                }
            `;


            historyList.appendChild(
                card
            );

        }
    );

}


/* SIDEBAR */

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

    const sidebarOpen =
        sidebar.classList.contains(
            "open"
        );

    const drawerOpen =
        clientDrawer.classList.contains(
            "visible"
        );


    if (
        !sidebarOpen &&
        !drawerOpen
    ) {

        overlay.classList.remove(
            "visible"
        );

        document.body.style.overflow =
            "";

    }

}


/* FUTURE LINKS */

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


                    alert(
                        `El módulo "${page}" todavía no está construido.`
                    );

                }
            );

        }
    );


/* RENDER GENERAL */

function renderEverything() {

    buildClients();

    renderStats();

    renderClients();

}


/* EVENTOS */

searchInput.addEventListener(
    "input",
    renderClients
);


sortSelect.addEventListener(
    "change",
    renderClients
);


filters.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-filter]"
            );


        if (!button) {
            return;
        }


        currentFilter =
            button.dataset.filter;


        filters
            .querySelectorAll(
                ".filter-button"
            )
            .forEach(
                current => {

                    current.classList.remove(
                        "active"
                    );

                }
            );


        button.classList.add(
            "active"
        );


        renderClients();

    }
);

/* =====================================================
   ABRIR DETALLE DESDE CUALQUIER PARTE DE LA FILA
===================================================== */

clientsTable.addEventListener("click", event => {

    const row = event.target.closest("tr");

    if (!row || !clientsTable.contains(row)) {
        return;
    }

    const button = row.querySelector("[data-client-key]");

    if (!button) {
        return;
    }

    // Si se presiona otro control interactivo,
    // respetamos su comportamiento original.
    if (
        event.target.closest(
            "a, input, select, textarea, button:not([data-client-key])"
        )
    ) {
        return;
    }

    openClientDetail(button.dataset.clientKey);
});


/* ACCESIBILIDAD CON TECLADO */

clientsTable.addEventListener("keydown", event => {

    if (!["Enter", " "].includes(event.key)) {
        return;
    }

    const row = event.target.closest("tr");

    if (
        !row ||
        !clientsTable.contains(row) ||
        event.target !== row
    ) {
        return;
    }

    const button = row.querySelector("[data-client-key]");

    if (!button) {
        return;
    }

    event.preventDefault();

    openClientDetail(button.dataset.clientKey);
});


closeDrawerButton.addEventListener(
    "click",
    closeClientDetail
);


menuButton.addEventListener(
    "click",
    openSidebar
);


overlay.addEventListener(
    "click",
    () => {

        if (
            clientDrawer.classList.contains(
                "visible"
            )
        ) {

            closeClientDetail();

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
            clientDrawer.classList.contains(
                "visible"
            )
        ) {

            closeClientDetail();

            return;

        }


        closeSidebar();

    }
);


/* =====================================================
   SINCRONIZACIÓN CON FIRESTORE
===================================================== */

window.addEventListener(
    "pisadabacana:orders-updated",
    event => {

        const firestoreOrders =
            event.detail?.orders;

        if (!Array.isArray(firestoreOrders)) {
            return;
        }

        orders = firestoreOrders;

        renderEverything();
    }
);

/* INICIO */

function initialize() {

    setCurrentDate();

    renderEverything();

}


initialize();