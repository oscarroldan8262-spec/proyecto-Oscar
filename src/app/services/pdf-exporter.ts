import {Injectable} from '@angular/core';
import {FullBitacoraSnapshot} from '../models/shift-log';

@Injectable({
  providedIn: 'root',
})
export class PdfExporter {
  async exportBitacora(snapshot: FullBitacoraSnapshot): Promise<void> {
    const {jsPDF} = await import('jspdf');
    const {bitacora, produccion, incidencias, maquinas, eventos, firmas} =
      snapshot;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 14;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }
    };

    const drawSectionHeader = (title: string, bgRgb: [number, number, number]) => {
      ensureSpace(14);
      doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(52, 64, 84);
      doc.text(title, margin + 3, y + 5.2);
      y += 10;
    };

    // Header Banner
    doc.setFillColor(213, 237, 227);
    doc.roundedRect(margin, y, contentWidth, 20, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(52, 64, 84);
    doc.text('BITÁCORA DIGITAL DE CAMBIO DE TURNO', margin + 4, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Folio: ${bitacora.folio}   |   Estado: ${bitacora.estado.toUpperCase()}   |   Área: ${bitacora.areaLinea}`,
      margin + 4,
      y + 14.5,
    );
    y += 24;

    // Datos Generales
    drawSectionHeader('1. DATOS GENERALES DEL RELEVO', [220, 232, 241]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const generalRows = [
      [`Fecha: ${bitacora.fecha}`, `Área / Línea: ${bitacora.areaLinea}`],
      [
        `Turno Saliente: ${bitacora.turnoSaliente}`,
        `Turno Entrante: ${bitacora.turnoEntrante}`,
      ],
      [
        `Supervisor Saliente: ${bitacora.supervisorSaliente}`,
        `Supervisor Entrante: ${bitacora.supervisorEntrante}`,
      ],
    ];
    for (const [left, right] of generalRows) {
      ensureSpace(6);
      doc.text(left, margin + 2, y);
      doc.text(right, margin + contentWidth / 2 + 2, y);
      y += 5.5;
    }
    y += 2;

    // Resumen del Turno
    drawSectionHeader('2. RESUMEN DEL TURNO', [183, 220, 200]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const kpiLine = `Producción Total: ${bitacora.totalProduccion} u   |   Cumplimiento: ${bitacora.cumplimientoPromedio}%   |   Incidencias: ${bitacora.totalIncidencias} (Pendientes: ${bitacora.incidenciasPendientes})   |   Máquinas Detenidas: ${bitacora.maquinasDetenidas}`;
    doc.text(kpiLine, margin + 2, y);
    y += 7;

    // Producción del Turno
    drawSectionHeader('3. PRODUCCIÓN DEL TURNO', [213, 237, 227]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Producto', margin + 2, y);
    doc.text('Meta', margin + 96, y, {align: 'right'});
    doc.text('Producido', margin + 128, y, {align: 'right'});
    doc.text('Cumplimiento', margin + contentWidth - 2, y, {align: 'right'});
    y += 4;
    doc.setDrawColor(210, 218, 226);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    let sumMeta = 0;
    let sumProd = 0;
    for (const row of produccion) {
      ensureSpace(6);
      sumMeta += row.meta;
      sumProd += row.producido;
      doc.text(row.producto.slice(0, 48), margin + 2, y);
      doc.text(String(row.meta), margin + 96, y, {align: 'right'});
      doc.text(String(row.producido), margin + 128, y, {align: 'right'});
      doc.text(`${row.cumplimiento.toFixed(1)}%`, margin + contentWidth - 2, y, {
        align: 'right',
      });
      y += 5;
    }
    const totalCumplimiento = sumMeta > 0 ? (sumProd / sumMeta) * 100 : 0;
    doc.setFont('helvetica', 'bold');
    doc.line(margin, y - 2, margin + contentWidth, y - 2);
    doc.text('TOTAL DEL TURNO', margin + 2, y + 2);
    doc.text(String(sumMeta), margin + 96, y + 2, {align: 'right'});
    doc.text(String(sumProd), margin + 128, y + 2, {align: 'right'});
    doc.text(`${totalCumplimiento.toFixed(1)}%`, margin + contentWidth - 2, y + 2, {
      align: 'right',
    });
    y += 8;

    // Incidencias y Pendientes
    drawSectionHeader('4. INCIDENCIAS Y PENDIENTES', [247, 232, 181]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (incidencias.length === 0) {
      doc.text('Sin incidencias registradas en este turno.', margin + 2, y);
      y += 6;
    } else {
      for (const inc of incidencias) {
        ensureSpace(7);
        const line = `[${inc.hora}] ${inc.maquina} — ${inc.descripcion} (${inc.estado})`;
        const wrapped = doc.splitTextToSize(line, contentWidth - 4) as string[];
        doc.text(wrapped, margin + 2, y);
        y += wrapped.length * 4.5 + 1.5;
      }
    }
    y += 2;

    // Estado de Máquinas y Checklist
    drawSectionHeader('5. ESTADO DE MÁQUINAS Y CHECKLIST DE ENTREGA', [222, 213, 240]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (const maq of maquinas) {
      ensureSpace(5.5);
      doc.text(`• ${maq.nombre}: ${maq.estado}`, margin + 2, y);
      y += 5;
    }
    y += 2;
    const checks = [
      {label: 'Equipos limpios', ok: bitacora.equiposLimpios},
      {label: 'Herramientas completas', ok: bitacora.herramientasCompletas},
      {label: 'Material abastecido', ok: bitacora.materialAbastecido},
      {label: 'Sin riesgos de seguridad', ok: bitacora.sinRiesgosSeguridad},
    ];
    const checkedCount = checks.filter((c) => c.ok).length;
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Checklist de Entrega: ${(checkedCount / 4) * 100}% (${checkedCount}/4 elementos verificados)`,
      margin + 2,
      y,
    );
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const c of checks) {
      ensureSpace(5);
      doc.text(`${c.ok ? '[X]' : '[ ]'} ${c.label}`, margin + 4, y);
      y += 4.5;
    }
    y += 3;

    // Línea de Tiempo de Eventos
    drawSectionHeader('6. LÍNEA DE TIEMPO DE EVENTOS', [199, 221, 242]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (eventos.length === 0) {
      doc.text('Sin eventos registrados en la línea de tiempo.', margin + 2, y);
      y += 6;
    } else {
      for (const ev of eventos) {
        ensureSpace(11);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${ev.hora}  |  ${ev.categoria}  |  ${ev.titulo} (${ev.estado})`,
          margin + 2,
          y,
        );
        y += 4.2;
        doc.setFont('helvetica', 'normal');
        const desc = doc.splitTextToSize(
          `${ev.descripcion} — Resp: ${ev.responsable}`,
          contentWidth - 6,
        ) as string[];
        doc.text(desc, margin + 4, y);
        y += desc.length * 4 + 2;
      }
    }
    y += 2;

    // Notas
    drawSectionHeader('7. NOTAS PARA EL SIGUIENTE TURNO', [220, 232, 241]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const notasLines = doc.splitTextToSize(
      bitacora.notas.trim() || 'Sin observaciones adicionales.',
      contentWidth - 4,
    ) as string[];
    ensureSpace(notasLines.length * 4.5 + 4);
    doc.text(notasLines, margin + 2, y);
    y += notasLines.length * 4.5 + 5;

    // Firmas
    drawSectionHeader('8. FIRMAS DE SUPERVISORES', [213, 237, 227]);
    ensureSpace(34);
    const firmaSaliente = firmas.find((f) => f.tipo === 'saliente');
    const firmaEntrante = firmas.find((f) => f.tipo === 'entrante');

    const boxWidth = (contentWidth - 8) / 2;
    doc.setDrawColor(190, 200, 210);
    doc.roundedRect(margin, y, boxWidth, 28, 2, 2);
    doc.roundedRect(margin + boxWidth + 8, y, boxWidth, 28, 2, 2);

    if (firmaSaliente?.dataUrl) {
      try {
        doc.addImage(firmaSaliente.dataUrl, 'PNG', margin + 6, y + 2, boxWidth - 12, 16);
      } catch {
        // Ignore invalid image data
      }
    }
    if (firmaEntrante?.dataUrl) {
      try {
        doc.addImage(
          firmaEntrante.dataUrl,
          'PNG',
          margin + boxWidth + 14,
          y + 2,
          boxWidth - 12,
          16,
        );
      } catch {
        // Ignore invalid image data
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FIRMA SUPERVISOR SALIENTE', margin + boxWidth / 2, y + 22, {
      align: 'center',
    });
    doc.text(
      'FIRMA SUPERVISOR ENTRANTE',
      margin + boxWidth + 8 + boxWidth / 2,
      y + 22,
      {align: 'center'},
    );
    doc.setFont('helvetica', 'normal');
    doc.text(bitacora.supervisorSaliente, margin + boxWidth / 2, y + 26, {
      align: 'center',
    });
    doc.text(
      bitacora.supervisorEntrante,
      margin + boxWidth + 8 + boxWidth / 2,
      y + 26,
      {align: 'center'},
    );

    const filename = `Bitacora_${bitacora.folio}_${bitacora.fecha}.pdf`;
    doc.save(filename);
  }
}
