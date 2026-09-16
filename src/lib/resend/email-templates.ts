/**
 * Escapes HTML-significant characters so user-controlled strings (client
 * name, notes-derived fields, price notes, etc.) can never break out of the
 * surrounding markup or inject arbitrary HTML/script into the sent email
 * (see C-4).
 */
export function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function esc(value: string | undefined | null): string {
  return value ? escapeHtml(value) : "";
}

interface AppointmentEmailData {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  currency: string;
  businessPhone?: string;
  cancelUrl?: string;
  appointmentId?: string;
  siteUrl?: string;
  /** Optional note shown under the price row (e.g. deposit disclaimer). */
  priceNote?: string;
}

export function appointmentConfirmationEmail(
  data: AppointmentEmailData
): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#059669;padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;">¡Cita confirmada!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;color:#374151;">Hola <strong>${esc(data.clientName)}</strong>,</p>
                  <p style="margin:0 0 24px;color:#6b7280;">Tu cita con <strong>${esc(data.businessName)}</strong> ha sido programada correctamente.</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;border-radius:8px;padding:16px;">
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Servicio</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.serviceName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Fecha</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.date)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Hora</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.startTime)} - ${esc(data.endTime)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">${data.priceNote ? "Depósito pagado" : "Precio"}</td>
                      <td style="padding:8px 16px;color:#059669;font-weight:700;">${esc(data.price)} ${esc(data.currency)}</td>
                    </tr>
                  </table>
                  ${data.priceNote ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;">${esc(data.priceNote)}</p>` : ""}

                  ${data.cancelUrl ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                    <tr>
                      <td align="center" style="padding:8px;">
                        <a href="${esc(data.cancelUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;text-decoration:none;color:#ffffff;background-color:#dc2626;border-radius:6px;">Cancelar cita</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
                    ¿No puedes asistir? Cancela con antelación para liberar el espacio.
                  </p>` : (data.businessPhone ? `
                  <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">
                    ¿Necesitas reprogramar o cancelar? Contáctanos al <strong>${esc(data.businessPhone)}</strong>
                  </p>` : "")}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">Enviado por <strong>Agendalo</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export function appointmentReminderEmail(
  data: AppointmentEmailData
): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#2563eb;padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;">Recordatorio de cita</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;color:#374151;">Hola <strong>${esc(data.clientName)}</strong>,</p>
                  <p style="margin:0 0 24px;color:#6b7280;">Te recordamos que tienes una cita próxima con <strong>${esc(data.businessName)}</strong>.</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;border-radius:8px;padding:16px;">
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Servicio</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.serviceName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Fecha</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.date)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Hora</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.startTime)} - ${esc(data.endTime)}</td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                    <tr>
                      <td align="center" style="padding:8px;">
                        <a href="${data.cancelUrl ? esc(data.cancelUrl) : "#"}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;text-decoration:none;color:#ffffff;background-color:#dc2626;border-radius:6px;">Cancelar cita</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
                    ¿No puedes asistir? Avísanos con antelación para que podamos ofrecer el espacio a otros.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export function appointmentCancelledEmail(
  data: AppointmentEmailData
): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color:#dc2626;padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;">Cita cancelada</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;color:#374151;">Hola <strong>${esc(data.clientName)}</strong>,</p>
                  <p style="margin:0 0 24px;color:#6b7280;">Tu cita con <strong>${esc(data.businessName)}</strong> ha sido cancelada.</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;border-radius:8px;padding:16px;">
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Servicio</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.serviceName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Fecha</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.date)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:14px;">Hora</td>
                      <td style="padding:8px 16px;color:#111827;font-weight:600;">${esc(data.startTime)}</td>
                    </tr>
                  </table>

                  <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">
                    Si deseas agendar una nueva cita, no dudes en contactarnos.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}