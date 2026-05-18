"""
PDF Report Generator — Creates a formatted PDF summary of drift events
using ReportLab for audit and documentation purposes.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    HRFlowable, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_drift_report_pdf(report_data: dict) -> bytes:
    """
    Generate a formatted PDF report for a drift event.
    
    Args:
        report_data: Dictionary containing all drift analysis results.
    
    Returns:
        PDF file as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           topMargin=0.5*inch, bottomMargin=0.5*inch,
                           leftMargin=0.75*inch, rightMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Title'],
        fontSize=24, spaceAfter=6, textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'Subtitle', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'SectionHeading', parent=styles['Heading2'],
        fontSize=14, textColor=colors.HexColor('#6C63FF'),
        spaceBefore=16, spaceAfter=8
    )
    body_style = ParagraphStyle(
        'BodyText', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph("DriftInsights — Drift Analysis Report", title_style))
    elements.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | "
        f"K.K. Wagh Institute of Engineering, Nashik",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", color=colors.HexColor('#E2E8F0')))
    elements.append(Spacer(1, 12))
    
    # Section 1: Drift Detection Summary
    elements.append(Paragraph("1. Drift Detection Summary", heading_style))
    
    detection = report_data.get("detection", {})
    summary_data = [
        ["Metric", "Value"],
        ["Change Point (Sample Index)", str(detection.get("change_point", "N/A"))],
        ["Pre-drift Error Rate", f"{detection.get('pre_drift_error', 0)*100:.1f}%"],
        ["Post-drift Error Rate", f"{detection.get('post_drift_error', 0)*100:.1f}%"],
        ["Error Rate Change", f"+{detection.get('error_change', 0)*100:.1f}%"],
        ["Detection Method", "ADWIN (River library)"],
        ["ADWIN Delta", str(detection.get("adwin_delta", 0.002))]
    ]
    
    t = Table(summary_data, colWidths=[2.5*inch, 4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6C63FF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))
    
    # Section 2: Severity & Strategy
    elements.append(Paragraph("2. Severity Classification & Adaptation Strategy", heading_style))
    
    severity = report_data.get("severity", {})
    severity_color = {
        "MINOR": colors.HexColor('#059669'),
        "MODERATE": colors.HexColor('#D97706'),
        "SEVERE": colors.HexColor('#DC2626')
    }.get(severity.get("severity", ""), colors.gray)
    
    elements.append(Paragraph(
        f"<b>Drift Severity:</b> {severity.get('severity', 'N/A')} &nbsp;|&nbsp; "
        f"<b>ΔE Total:</b> {report_data.get('delta_e_total', 0):.4f}", body_style
    ))
    elements.append(Paragraph(
        f"<b>Selected Strategy:</b> {severity.get('strategy', 'N/A')}", body_style
    ))
    elements.append(Paragraph(severity.get('description', ''), body_style))
    elements.append(Spacer(1, 12))
    
    # Section 3: Feature Importance Change Table
    elements.append(Paragraph("3. Feature Importance Change Report", heading_style))
    
    shap_report = report_data.get("shap_report", [])
    if shap_report:
        table_data = [["Rank", "Feature", "SHAP Before", "SHAP After", "Delta E", "Direction"]]
        for i, row in enumerate(shap_report[:10]):
            direction = "↑ Increased" if row.get("direction") == "Up" else "↓ Decreased"
            table_data.append([
                str(i + 1),
                row.get("feature", ""),
                f"{row.get('shap_before', 0):.4f}",
                f"{row.get('shap_after', 0):.4f}",
                f"{row.get('delta_e', 0):.4f}",
                direction
            ])
        
        t = Table(table_data, colWidths=[0.4*inch, 1.5*inch, 1*inch, 1*inch, 0.9*inch, 1.2*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0D9488')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)
    
    elements.append(Spacer(1, 12))
    
    # Section 4: Adaptation Result
    adaptation = report_data.get("adaptation", {})
    if adaptation:
        elements.append(Paragraph("4. Adaptation Result", heading_style))
        elements.append(Paragraph(
            f"<b>Strategy Executed:</b> {adaptation.get('strategy_used', 'N/A')}", body_style
        ))
        elements.append(Paragraph(
            f"<b>Validation Accuracy:</b> {adaptation.get('validation', {}).get('accuracy', 0)*100:.1f}%", body_style
        ))
        elements.append(Paragraph(
            f"<b>Elapsed Time:</b> {adaptation.get('elapsed_seconds', 0):.2f}s", body_style
        ))
    
    elements.append(Spacer(1, 24))
    
    # Disclaimer
    elements.append(HRFlowable(width="100%", color=colors.HexColor('#E2E8F0')))
    elements.append(Spacer(1, 8))
    disclaimer_style = ParagraphStyle(
        'Disclaimer', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#94A3B8'),
        spaceAfter=4
    )
    elements.append(Paragraph(
        "Disclaimer: Delta E characterises model-level behaviour change — how the model's reliance on "
        "features has shifted. It does not assert direct real-world causation of the distributional shift.",
        disclaimer_style
    ))
    elements.append(Paragraph(
        "DriftInsights — B.Tech Final Year Project, K.K. Wagh Institute of Engineering, Nashik.",
        disclaimer_style
    ))
    
    doc.build(elements)
    return buffer.getvalue()
