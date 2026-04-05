# specs/payslip-analysis.md — Lønseddel-analyse

## Job to Be Done
A user uploads their payslip and wants to understand every single deduction — AM-bidrag, A-skat, ATP, pension — in plain Danish. They also want to know if their salary is normal for their industry.

## Requirements

### Input
- File upload (PDF or image of payslip)
- Client-side OCR (Tesseract.js) — no data leaves browser
- GDPR-compliant: RedactionReview component lets user verify/redact before analysis

### Processing
- Extract: bruttoløn, nettoløn, AM-bidrag, A-skat, ATP, pension, other deductions
- Validate extracted amounts against expected tax math
- Flag discrepancies between actual and expected deductions

### Output
- Line-by-line breakdown of every deduction with plain Danish explanation
- Visual: "Sådan er din løn fordelt" — pie/bar chart
- Comparison: "Er din løn normal?" against industry/role benchmarks (if data available)
- Tooltips on every tax term explaining it simply

### Acceptance Criteria
- [ ] OCR runs entirely client-side (Tesseract.js)
- [ ] RedactionReview component shows extracted data before analysis
- [ ] File never uploaded to any server
- [ ] Loading state during OCR processing (can take 5-15 seconds)
- [ ] Error handling: unreadable file, wrong file type, OCR failure
- [ ] Explanations are in plain Danish — no jargon without tooltip
- [ ] Works on mobile (camera upload)
