"use strict";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STORAGE_KEY = "pisadaBacanaOrders";

const ORDER_STATUSES = [
    "Recibido",
    "En espera",
    "Lavando",
    "Secando",
    "Listo",
    "Entregado"
];

let orders = loadOrders();
let filteredOrders = [];


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

const periodFilter =
    document.getElementById("periodFilter");

const printReportButton =
    document.getElementById("printReportButton");


/* MÉTRICAS */

const totalSales =
    document.getElementById("totalSales");

const totalCollected =
    document.getElementById("totalCollected");

const totalPending =
    document.getElementById("totalPending");

const totalOrders =
    document.getElementById("totalOrders");

const salesDescription =
    document.getElementById("salesDescription");

const collectionPercentage =
    document.getElementById("collectionPercentage");

const pendingDescription =
    document.getElementById("pendingDescription");

const deliveredDescription =
    document.getElementById("deliveredDescription");


/* GRÁFICA */

const revenueChart =
    document.getElementById("revenueChart");

const chartTotal =
    document.getElementById("chartTotal");

const chartSubtitle =
    document.getElementById("chartSubtitle");


/* ESTADOS */

const statusReport =
    document.getElementById("statusReport");


/* RANKINGS */

const servicesRanking =
    document.getElementById("servicesRanking");

const servicesEmpty =
    document.getElementById("servicesEmpty");

const clientsRanking =
    document.getElementById("clientsRanking");

const clientsEmpty =
    document.getElementById("clientsEmpty");


/* PRODUCTOS */

const shoesCount =
    document.getElementById("shoesCount");

const shoesPercentage =
    document.getElementById("shoesPercentage");

const capsCount =
    document.getElementById("capsCount");

const capsPercentage =
    document.getElementById("capsPercentage");


/* RESUMEN */

const averageTicket =
    document.getElementById("averageTicket");

const uniqueClients =
    document.getElementById("uniqueClients");

const repeatClients =
    document.getElementById("repeatClients");

const deliveredOrders =
    document.getElementById("deliveredOrders");

const activeOrders =
    document.getElementById("activeOrders");


/* TABLA */

const ordersTable =
    document.getElementById("ordersTable");

const tableOrderCount =
    document.getElementById("tableOrderCount");

const tableEmpty =
    document.getElementById("tableEmpty");


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


function getOrderDate(order) {

    const date =
        new Date(
            order.createdAt || 0
        );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


function getOrderBalance(order) {

    if (
        order.balance !== undefined &&
        order.balance !== null &&
        order.balance !== ""
    ) {

        const balance =
            Number(order.balance);

        if (
            Number.isFinite(balance)
        ) {

            return Math.max(
                balance,
                0
            );

        }

    }


    return Math.max(
        Number(order.price || 0) -
        Number(order.advance || 0),
        0
    );

}


function getOrderCollected(order) {

    return Math.max(
        Number(order.price || 0) -
        getOrderBalance(order),
        0
    );

}


function getClientKey(order) {

    const phone =
        String(order.phone || "")
            .replace(/\D/g, "");


    if (phone) {
        return `phone:${phone}`;
    }


    return `name:${normalizeText(
        order.clientName
    )}`;

}


function percentage(
    value,
    total
) {

    if (
        !total ||
        total <= 0
    ) {
        return 0;
    }


    return Math.round(
        (value / total) * 100
    );

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


/* =====================================================
   FILTRADO POR PERIODO
===================================================== */

function getOrdersByPeriod() {

    const period =
        periodFilter.value;

    const now =
        new Date();


    const todayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    return orders.filter(
        order => {

            if (
                period === "all"
            ) {
                return true;
            }


            const date =
                getOrderDate(order);


            if (!date) {
                return false;
            }


            if (
                period === "today"
            ) {

                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth() &&
                    date.getDate() ===
                        now.getDate()
                );

            }


            if (
                period === "week"
            ) {

                const start =
                    new Date(todayStart);

                start.setDate(
                    start.getDate() - 6
                );


                return (
                    date >= start &&
                    date <= now
                );

            }


            if (
                period === "month"
            ) {

                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth()
                );

            }


            if (
                period === "year"
            ) {

                return (
                    date.getFullYear() ===
                    now.getFullYear()
                );

            }


            return true;

        }
    );

}


/* =====================================================
   MÉTRICAS
===================================================== */

function renderStats() {

    const sales =
        filteredOrders.reduce(
            (total, order) =>
                total +
                Number(order.price || 0),
            0
        );


    const collected =
        filteredOrders.reduce(
            (total, order) =>
                total +
                getOrderCollected(order),
            0
        );


    const pending =
        filteredOrders.reduce(
            (total, order) =>
                total +
                getOrderBalance(order),
            0
        );


    const pendingCount =
        filteredOrders.filter(
            order =>
                getOrderBalance(order) > 0
        ).length;


    const delivered =
        filteredOrders.filter(
            order =>
                normalizeText(order.status) ===
                "entregado"
        ).length;


    totalSales.textContent =
        formatMoney(sales);


    totalCollected.textContent =
        formatMoney(collected);


    totalPending.textContent =
        formatMoney(pending);


    totalOrders.textContent =
        filteredOrders.length;


    salesDescription.textContent =
        `${filteredOrders.length} ${
            filteredOrders.length === 1
                ? "pedido"
                : "pedidos"
        } en el periodo`;


    collectionPercentage.textContent =
        `${percentage(
            collected,
            sales
        )}% cobrado`;


    pendingDescription.textContent =
        `${pendingCount} ${
            pendingCount === 1
                ? "pedido pendiente"
                : "pedidos pendientes"
        }`;


    deliveredDescription.textContent =
        `${delivered} entregados`;


    chartTotal.textContent =
        formatMoney(sales);

}


/* =====================================================
   GRÁFICA
===================================================== */

function getChartData() {

    const period =
        periodFilter.value;

    const now =
        new Date();


    /*
        HOY:
        divide los pedidos por bloques horarios.
    */

    if (
        period === "today"
    ) {

        const groups = [
            {
                label: "08h",
                min: 0,
                max: 9,
                total: 0
            },
            {
                label: "10h",
                min: 10,
                max: 11,
                total: 0
            },
            {
                label: "12h",
                min: 12,
                max: 13,
                total: 0
            },
            {
                label: "14h",
                min: 14,
                max: 15,
                total: 0
            },
            {
                label: "16h",
                min: 16,
                max: 17,
                total: 0
            },
            {
                label: "18h+",
                min: 18,
                max: 23,
                total: 0
            }
        ];


        filteredOrders.forEach(
            order => {

                const date =
                    getOrderDate(order);

                if (!date) {
                    return;
                }


                const hour =
                    date.getHours();


                const group =
                    groups.find(
                        item =>
                            hour >= item.min &&
                            hour <= item.max
                    );


                if (group) {

                    group.total +=
                        Number(
                            order.price || 0
                        );

                }

            }
        );


        chartSubtitle.textContent =
            "Valor generado durante el día";


        return groups;

    }


    /*
        ÚLTIMOS 7 DÍAS
    */

    if (
        period === "week"
    ) {

        const groups = [];


        for (
            let index = 6;
            index >= 0;
            index--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() - index
                );


            groups.push({
                dateKey:
                    getDateKey(date),

                label:
                    new Intl.DateTimeFormat(
                        "es-MX",
                        {
                            weekday: "short"
                        }
                    )
                        .format(date)
                        .replace(".", ""),

                total: 0
            });

        }


        filteredOrders.forEach(
            order => {

                const date =
                    getOrderDate(order);

                if (!date) {
                    return;
                }


                const group =
                    groups.find(
                        item =>
                            item.dateKey ===
                            getDateKey(date)
                    );


                if (group) {

                    group.total +=
                        Number(
                            order.price || 0
                        );

                }

            }
        );


        chartSubtitle.textContent =
            "Valor generado en los últimos 7 días";


        return groups;

    }


    /*
        MES:
        divide el mes en semanas.
    */

    if (
        period === "month"
    ) {

        const groups = [
            {
                label: "Sem 1",
                min: 1,
                max: 7,
                total: 0
            },
            {
                label: "Sem 2",
                min: 8,
                max: 14,
                total: 0
            },
            {
                label: "Sem 3",
                min: 15,
                max: 21,
                total: 0
            },
            {
                label: "Sem 4",
                min: 22,
                max: 28,
                total: 0
            },
            {
                label: "Sem 5",
                min: 29,
                max: 31,
                total: 0
            }
        ];


        filteredOrders.forEach(
            order => {

                const date =
                    getOrderDate(order);

                if (!date) {
                    return;
                }


                const day =
                    date.getDate();


                const group =
                    groups.find(
                        item =>
                            day >= item.min &&
                            day <= item.max
                    );


                if (group) {

                    group.total +=
                        Number(
                            order.price || 0
                        );

                }

            }
        );


        chartSubtitle.textContent =
            "Valor generado por semana del mes";


        return groups;

    }


    /*
        AÑO:
        divide por meses.
    */

    if (
        period === "year"
    ) {

        const monthNames = [
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic"
        ];


        const groups =
            monthNames.map(
                (label, index) => ({
                    label,
                    month: index,
                    total: 0
                })
            );


        filteredOrders.forEach(
            order => {

                const date =
                    getOrderDate(order);

                if (!date) {
                    return;
                }


                groups[
                    date.getMonth()
                ].total +=
                    Number(
                        order.price || 0
                    );

            }
        );


        chartSubtitle.textContent =
            `Valor generado durante ${now.getFullYear()}`;


        return groups;

    }


    /*
        TODO EL HISTORIAL:
        agrupamos por mes/año.
    */

    const monthMap =
        new Map();


    filteredOrders.forEach(
        order => {

            const date =
                getOrderDate(order);

            if (!date) {
                return;
            }


            const key =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;


            if (
                !monthMap.has(key)
            ) {

                monthMap.set(
                    key,
                    {
                        key,

                        label:
                            new Intl.DateTimeFormat(
                                "es-MX",
                                {
                                    month: "short",
                                    year: "2-digit"
                                }
                            )
                                .format(date)
                                .replace(".", ""),

                        total: 0
                    }
                );

            }


            monthMap.get(key).total +=
                Number(
                    order.price || 0
                );

        }
    );


    chartSubtitle.textContent =
        "Valor generado por mes";


    return Array.from(
        monthMap.values()
    )
        .sort(
            (a, b) =>
                a.key.localeCompare(b.key)
        )
        .slice(-12);

}


function getDateKey(date) {

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


function renderChart() {

    revenueChart.innerHTML = "";


    const data =
        getChartData();


    if (
        data.length === 0
    ) {

        revenueChart.innerHTML = `
            <div class="chart-empty">
                Sin información
            </div>
        `;

        return;

    }


    const maxValue =
        Math.max(
            ...data.map(
                item => item.total
            ),
            1
        );


    data.forEach(
        item => {

            const height =
                item.total > 0
                    ? Math.max(
                        (item.total / maxValue) * 82,
                        3
                    )
                    : 1;


            const column =
                document.createElement(
                    "div"
                );


            column.className =
                "bar-column";


            column.innerHTML = `
                <span class="bar-value">
                    ${formatCompactMoney(
                        item.total
                    )}
                </span>

                <div
                    class="bar"
                    style="height: ${height}%"
                    title="${escapeHTML(
                        item.label
                    )}: ${escapeHTML(
                        formatMoney(item.total)
                    )}"
                ></div>

                <span class="bar-label">
                    ${escapeHTML(
                        item.label
                    )}
                </span>
            `;


            revenueChart.appendChild(
                column
            );

        }
    );

}


function formatCompactMoney(value) {

    const amount =
        Number(value) || 0;


    if (
        amount >= 1000000
    ) {

        return `$${(
            amount / 1000000
        ).toFixed(1)}M`;

    }


    if (
        amount >= 1000
    ) {

        return `$${(
            amount / 1000
        ).toFixed(1)}k`;

    }


    return `$${Math.round(amount)}`;

}


/* =====================================================
   ESTADOS
===================================================== */

function renderStatusReport() {

    statusReport.innerHTML = "";


    ORDER_STATUSES.forEach(
        (status, index) => {

            const count =
                filteredOrders.filter(
                    order =>
                        normalizeText(
                            order.status
                        ) ===
                        normalizeText(status)
                ).length;


            const percent =
                percentage(
                    count,
                    filteredOrders.length
                );


            const item =
                document.createElement(
                    "div"
                );


            const colors = [
                "",
                "orange",
                "purple",
                "red",
                "green",
                "green"
            ];


            item.className =
                "status-item";


            item.innerHTML = `
                <div class="status-info">

                    <span>
                        ${escapeHTML(status)}
                    </span>

                    <strong>
                        ${count}
                        ·
                        ${percent}%
                    </strong>

                </div>

                <div class="progress">

                    <div
                        class="progress-bar ${colors[index]}"
                        style="width: ${percent}%"
                    ></div>

                </div>
            `;


            statusReport.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   SERVICIOS
===================================================== */

function renderServices() {

    const serviceMap =
        new Map();


    filteredOrders.forEach(
        order => {

            const service =
                String(
                    order.service ||
                    "Sin especificar"
                ).trim();


            if (
                !serviceMap.has(service)
            ) {

                serviceMap.set(
                    service,
                    {
                        name: service,
                        count: 0,
                        revenue: 0
                    }
                );

            }


            const data =
                serviceMap.get(service);


            data.count += 1;

            data.revenue +=
                Number(
                    order.price || 0
                );

        }
    );


    const services =
        Array.from(
            serviceMap.values()
        )
            .sort(
                (a, b) => {

                    if (
                        b.count !== a.count
                    ) {
                        return (
                            b.count -
                            a.count
                        );
                    }

                    return (
                        b.revenue -
                        a.revenue
                    );

                }
            )
            .slice(0, 5);


    servicesRanking.innerHTML =
        "";


    if (
        services.length === 0
    ) {

        servicesEmpty.classList.add(
            "visible"
        );

        return;

    }


    servicesEmpty.classList.remove(
        "visible"
    );


    services.forEach(
        (service, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "ranking-item";


            item.innerHTML = `
                <div class="rank-number">
                    ${index + 1}
                </div>

                <div class="ranking-info">

                    <strong>
                        ${escapeHTML(
                            service.name
                        )}
                    </strong>

                    <span>
                        ${service.count}
                        ${
                            service.count === 1
                                ? "pedido"
                                : "pedidos"
                        }
                    </span>

                </div>

                <div class="ranking-value">
                    ${formatMoney(
                        service.revenue
                    )}
                </div>
            `;


            servicesRanking.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   CLIENTES
===================================================== */

function buildClientReport() {

    const map =
        new Map();


    filteredOrders.forEach(
        order => {

            const key =
                getClientKey(order);


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {
                        name:
                            order.clientName ||
                            "Cliente sin nombre",

                        phone:
                            order.phone ||
                            "Sin teléfono",

                        orders: 0,

                        spent: 0
                    }
                );

            }


            const client =
                map.get(key);


            client.orders += 1;

            client.spent +=
                Number(
                    order.price || 0
                );


            if (
                order.clientName
            ) {

                client.name =
                    order.clientName;

            }

        }
    );


    return Array.from(
        map.values()
    );

}


function renderClients() {

    const clients =
        buildClientReport()
            .sort(
                (a, b) => {

                    if (
                        b.spent !== a.spent
                    ) {

                        return (
                            b.spent -
                            a.spent
                        );

                    }


                    return (
                        b.orders -
                        a.orders
                    );

                }
            )
            .slice(0, 5);


    clientsRanking.innerHTML =
        "";


    if (
        clients.length === 0
    ) {

        clientsEmpty.classList.add(
            "visible"
        );

        return;

    }


    clientsEmpty.classList.remove(
        "visible"
    );


    clients.forEach(
        (client, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "ranking-item";


            item.innerHTML = `
                <div class="rank-number">
                    ${index + 1}
                </div>

                <div class="ranking-info">

                    <strong>
                        ${escapeHTML(
                            client.name
                        )}
                    </strong>

                    <span>
                        ${client.orders}
                        ${
                            client.orders === 1
                                ? "pedido"
                                : "pedidos"
                        }
                    </span>

                </div>

                <div class="ranking-value">
                    ${formatMoney(
                        client.spent
                    )}
                </div>
            `;


            clientsRanking.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   PRODUCTOS
===================================================== */

function renderProducts() {

    let shoes = 0;
    let caps = 0;


    filteredOrders.forEach(
        order => {

            const type =
                normalizeText(
                    order.itemType
                );


            if (
                type.includes("gorra")
            ) {

                caps += 1;

            } else if (
                type.includes("teni") ||
                type.includes("zapato")
            ) {

                shoes += 1;

            }

        }
    );


    shoesCount.textContent =
        shoes;


    capsCount.textContent =
        caps;


    shoesPercentage.textContent =
        `${percentage(
            shoes,
            filteredOrders.length
        )}% del total`;


    capsPercentage.textContent =
        `${percentage(
            caps,
            filteredOrders.length
        )}% del total`;

}


/* =====================================================
   INDICADORES
===================================================== */

function renderSummary() {

    const sales =
        filteredOrders.reduce(
            (total, order) =>
                total +
                Number(order.price || 0),
            0
        );


    const average =
        filteredOrders.length > 0
            ? sales /
                filteredOrders.length
            : 0;


    const clients =
        buildClientReport();


    const recurrent =
        clients.filter(
            client =>
                client.orders > 1
        ).length;


    const delivered =
        filteredOrders.filter(
            order =>
                normalizeText(
                    order.status
                ) === "entregado"
        ).length;


    const active =
        filteredOrders.filter(
            order =>
                normalizeText(
                    order.status
                ) !== "entregado"
        ).length;


    averageTicket.textContent =
        formatMoney(average);


    uniqueClients.textContent =
        clients.length;


    repeatClients.textContent =
        recurrent;


    deliveredOrders.textContent =
        delivered;


    activeOrders.textContent =
        active;

}


/* =====================================================
   TABLA
===================================================== */

function renderOrdersTable() {

    ordersTable.innerHTML = "";


    const sorted =
        [...filteredOrders]
            .sort(
                (a, b) =>
                    new Date(
                        b.createdAt || 0
                    ) -
                    new Date(
                        a.createdAt || 0
                    )
            );


    tableOrderCount.textContent =
        `${sorted.length} ${
            sorted.length === 1
                ? "pedido"
                : "pedidos"
        }`;


    if (
        sorted.length === 0
    ) {

        tableEmpty.classList.add(
            "visible"
        );

        return;

    }


    tableEmpty.classList.remove(
        "visible"
    );


    sorted.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
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


            const delivered =
                normalizeText(
                    order.status
                ) === "entregado";


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


                <td>

                    <span class="cell-main">
                        ${escapeHTML(article)}
                    </span>

                    <span class="cell-sub">
                        ${escapeHTML(
                            order.itemType || ""
                        )}
                    </span>

                </td>


                <td>
                    ${escapeHTML(
                        order.service ||
                        "Sin especificar"
                    )}
                </td>


                <td>

                    <span class="status-badge ${
                        delivered
                            ? "delivered"
                            : ""
                    }">
                        ${escapeHTML(
                            order.status ||
                            "Sin estado"
                        )}
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

                    <strong class="${
                        balance > 0
                            ? "pending-money"
                            : "paid-money"
                    }">
                        ${
                            balance > 0
                                ? formatMoney(balance)
                                : "Pagado"
                        }
                    </strong>

                </td>
            `;


            ordersTable.appendChild(
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


                    alert(
                        "El módulo Ajustes todavía no está construido."
                    );

                }
            );

        }
    );


/* =====================================================
   RENDER GENERAL
===================================================== */

function renderEverything() {

    orders =
        loadOrders();


    filteredOrders =
        getOrdersByPeriod();


    navOrderCount.textContent =
        orders.filter(
            order =>
                normalizeText(
                    order.status
                ) !== "entregado"
        ).length;


    renderStats();

    renderChart();

    renderStatusReport();

    renderServices();

    renderClients();

    renderProducts();

    renderSummary();

    renderOrdersTable();

}


/* =====================================================
   EVENTOS
===================================================== */

periodFilter.addEventListener(
    "change",
    renderEverything
);


printReportButton.addEventListener(
    "click",
    () => {

        window.print();

    }
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