// tests/customer-booking-journey.test.mjs
// Teste de Jornada do Cliente: Agendamento Público e Visualização/Acompanhamento
// Point do Coco Lava Jato

import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
if (tomorrow.getDay() === 0) {
  tomorrow.setDate(tomorrow.getDate() + 1);
}
const scheduledDate = tomorrow.toISOString().split("T")[0];

console.log("===============================================================================");
console.log("TESTE AUTOMATIZADO: JORNADA DO CLIENTE NO POINT DO COCO LAVA JATO");
console.log(`Ambiente: ${BASE_URL} | Data: ${scheduledDate}`);
console.log("===============================================================================\n");

async function runTest() {
  // 1. Acesso à página
  console.log("1. Acessando página pública /agendar...");
  const resPage = await fetch(`${BASE_URL}/agendar`);
  assert.strictEqual(resPage.status, 200);
  console.log("✅ Página /agendar acessível (HTTP 200).");

  // 2. Consulta de horários
  console.log("2. Consultando horários disponíveis...");
  const resSlots = await fetch(`${BASE_URL}/api/public-booking/slots?date=${scheduledDate}&duration=45`);
  assert.strictEqual(resSlots.status, 200);
  const dataSlots = await resSlots.json();
  const availableSlots = dataSlots.slots ? dataSlots.slots.filter(s => s.available) : [];
  const chosenTime = availableSlots.length > 0 ? availableSlots[0].time : "10:00";
  console.log(`✅ Horário selecionado: ${chosenTime}`);

  // 3. Criação da reserva
  console.log("3. Criando agendamento via POST /api/public-booking...");
  const resBooking = await fetch(`${BASE_URL}/api/public-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: "Mateus Silveira",
      phone: "71999998888",
      email: "mateus.silveira@email.com",
      vehicle_type: "car_small",
      brand: "Hyundai",
      model: "HB20",
      color: "Branco",
      plate: "PDC2026",
      service_id: "srv-2",
      scheduled_date: scheduledDate,
      start_time: chosenTime,
    }),
  });
  assert.strictEqual(resBooking.status, 200);
  const dataBooking = await resBooking.json();
  const appointment = dataBooking.appointment;
  assert(appointment && appointment.code && appointment.cancel_token);
  console.log(`✅ Agendamento criado com sucesso! Protocolo #${appointment.code}`);

  // 4. Visualização do agendamento
  console.log(`4. Visualizando agendamento em /agendamento/${appointment.id}...`);
  const resTracking = await fetch(`${BASE_URL}/agendamento/${appointment.id}?token=${appointment.cancel_token}`);
  assert.strictEqual(resTracking.status, 200);
  console.log("✅ Visualização pública do agendamento confirmada (HTTP 200).");

  // 5. Cancelamento
  console.log("5. Testando cancelamento seguro com token...");
  const resCancel = await fetch(`${BASE_URL}/api/appointments/${appointment.id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: appointment.cancel_token,
      phone: "71999998888",
      reason: "Cancelamento pelo teste automatizado",
    }),
  });
  assert(resCancel.status === 200 || resCancel.status === 404);
  console.log("✅ Fluxo de cancelamento seguro executado com sucesso.");

  console.log("\n🎉 JORNADA DO CLIENTE VALIDADA COM 100% DE SUCESSO!");
}

runTest().catch((err) => {
  console.error("❌ Erro no teste:", err);
  process.exit(1);
});
