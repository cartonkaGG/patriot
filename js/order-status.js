/* Patriot Store — Order status timeline */

const ORDER_TIMELINE = [
  {
    key: 'packing',
    label: 'Комплектація',
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>'
  },
  {
    key: 'packed',
    label: 'Скомплектовано',
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>'
  },
  {
    key: 'awaiting_ship',
    label: 'Очікує відправки',
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'
  },
  {
    key: 'shipped',
    label: 'Відправлено',
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0h4m-4 0a2 2 0 104 0m-4 0a2 2 0 11-4 0M3 16h10"/>'
  },
  {
    key: 'delivered',
    label: 'Доставлено',
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"/>'
  }
];

const STATUS_TO_STEP = {
  new: 0,
  awaiting_payment: 0,
  packing: 0,
  processing: 1,
  packed: 1,
  awaiting_shipment: 2,
  shipped: 3,
  completed: 4,
  delivered: 4,
  cancelled: -1
};

const ORDER_STATUS_OPTIONS = [
  { value: 'new', label: 'Комплектація' },
  { value: 'packed', label: 'Скомплектовано' },
  { value: 'awaiting_shipment', label: 'Очікує відправки' },
  { value: 'shipped', label: 'Відправлено' },
  { value: 'completed', label: 'Доставлено' },
  { value: 'awaiting_payment', label: 'Очікує оплати' },
  { value: 'cancelled', label: 'Скасовано' }
];

function getOrderStepIndex(status) {
  if (status === 'cancelled') return -1;
  return STATUS_TO_STEP[status] ?? 0;
}

function renderOrderTimeline(status) {
  if (status === 'cancelled') {
    return '<div class="order-timeline-cancelled">Замовлення скасовано</div>';
  }

  const activeStep = getOrderStepIndex(status);
  const paymentBadge = status === 'awaiting_payment'
    ? '<p class="order-timeline-payment">Очікує оплати</p>'
    : '';

  const steps = ORDER_TIMELINE.map((step, index) => {
    let state = 'pending';
    if (index < activeStep) state = 'done';
    else if (index === activeStep) state = 'active';

    return `
      <div class="order-timeline-step order-timeline-step--${state}" title="${step.label}">
        <div class="order-timeline-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${step.icon}</svg>
        </div>
        <span class="order-timeline-label">${step.label}</span>
      </div>
      ${index < ORDER_TIMELINE.length - 1 ? '<div class="order-timeline-line"></div>' : ''}
    `;
  }).join('');

  return `${paymentBadge}<div class="order-timeline">${steps}</div>`;
}
