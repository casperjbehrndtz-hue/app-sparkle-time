import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Language = "da" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "kassen_lang";

// ─── Translations ────────────────────────────────────────────

const translations: Record<string, Record<Language, string>> = {
  // ─── Nav & Global ───
  "nav.products": { da: "Produkter", en: "Products" },
  "nav.howItWorks": { da: "Sådan virker det", en: "How it works" },
  "nav.back": { da: "Tilbage", en: "Back" },
  "nav.budget": { da: "Budget", en: "Budget" },
  "nav.coupleFinance": { da: "Parøkonomi", en: "Couple finance" },
  "nav.childTax": { da: "Børneskat", en: "Child tax" },

  // ─── Hero ───
  "hero.title": { da: "Find ud af hvad du", en: "Find out what you" },
  "hero.titleHighlight": { da: "reelt har til overs.", en: "really have left." },
  "hero.subtitle": { da: "Danmarks nemmeste budgetværktøj. Ingen regneark, ingen login — bare svar ja/nej og få dit reelle rådighedsbeløb på 3 minutter.", en: "Denmark's easiest budgeting tool. No spreadsheets, no login — just answer yes/no and get your real disposable income in 3 minutes." },
  "hero.cta": { da: "Beregn dit rådighedsbeløb", en: "Calculate your budget" },
  "hero.imageAlt": { da: "Budget planlægning og økonomisk overblik", en: "Budget planning and financial overview" },

  // ─── Trust badges ───
  "trust.danish": { da: "Bygget til dansk finanslovgivning", en: "Built for Danish finance" },
  "trust.time": { da: "Udfyldt på 3 minutter", en: "Done in 3 minutes" },
  "trust.private": { da: "100% privat · Data gemmes lokalt", en: "100% private · Data stored locally" },

  // ─── How it works section ───
  "howItWorks.title": { da: "Danmarks nemmeste budgetværktøj", en: "Denmark's easiest budgeting tool" },
  "howItWorks.subtitle": { da: "Ingen regneark. Bare svar ja/nej — vi klarer resten.", en: "No spreadsheets. Just answer yes/no — we handle the rest." },

  // ─── Stats ───
  "stats.3min": { da: "3 min", en: "3 min" },
  "stats.fillIn": { da: "At udfylde", en: "To complete" },
  "stats.avgSaving": { da: "Gns. besparelse/md.", en: "Avg. savings/mo." },
  "stats.freePrivate": { da: "Privat & gratis", en: "Private & free" },

  // ─── Feature cards ───
  "feature.findHidden": { da: "Find skjulte udgifter", en: "Find hidden expenses" },
  "feature.findHiddenDesc": { da: "Vi gennemgår streaming, forsikring og transport — og viser hvad der æder dit budget.", en: "We review streaming, insurance and transport — and show what's eating your budget." },
  "feature.aiInsight": { da: "AI-indsigt", en: "AI insights" },
  "feature.aiInsightDesc": { da: "Analyse af dine tal og udgiftsmønstre.", en: "Analysis of your numbers and spending patterns." },
  "feature.compare": { da: "Sammenlign med andre", en: "Compare with others" },
  "feature.compareDesc": { da: "Se din økonomi i forhold til lignende familier i dit område.", en: "See your finances compared to similar families in your area." },
  "feature.bankReport": { da: "Bankmøde-rapport", en: "Bank meeting report" },
  "feature.bankReportDesc": { da: "Tag en professionel rapport med til din bankrådgiver.", en: "Take a professional report to your bank advisor." },

  // ─── Testimonials ───
  "testimonials.title": { da: "Hvad andre siger", en: "What others say" },

  // ─── Bottom CTA ───
  "bottomCta.title": { da: "Klar til at komme i gang?", en: "Ready to get started?" },
  "bottomCta.subtitle": { da: "Det tager kun 3 minutter — og koster ingenting.", en: "It only takes 3 minutes — and it's completely free." },
  "bottomCta.noLogin": { da: "Ingen login · Ingen data deles · Alt gemmes lokalt", en: "No login · No data shared · Everything stored locally" },

  // ─── Footer ───
  "footer.tagline": { da: "Få det fulde overblik over din økonomi. Gratis, privat og bygget til danske forhold.", en: "Get a complete overview of your finances. Free, private and built for Danish conditions." },
  "footer.product": { da: "Produkt", en: "Product" },
  "footer.budgetCalc": { da: "Budgetberegner", en: "Budget calculator" },
  "footer.neighborComp": { da: "Nabo-sammenligning", en: "Neighbor comparison" },
  "footer.info": { da: "Information", en: "Information" },
  "footer.privacy": { da: "Privatlivspolitik", en: "Privacy policy" },
  "footer.terms": { da: "Vilkår & betingelser", en: "Terms & conditions" },
  "footer.contact": { da: "Kontakt", en: "Contact" },
  "footer.about": { da: "Om", en: "About" },
  "footer.private": { da: "100% privat · Data gemmes lokalt", en: "100% private · Data stored locally" },
  "footer.tools": { da: "Værktøjer", en: "Tools" },
  "footer.legal": { da: "Juridisk", en: "Legal" },
  "footer.disclaimer": { da: "Kassen er et budgetværktøj og yder ikke finansiel rådgivning. Tal med din bank eller en rådgiver om konkrete økonomiske beslutninger.", en: "Kassen is a budgeting tool and does not provide financial advice. Talk to your bank or an advisor about specific financial decisions." },
  "footer.based": { da: "Beregnet på danske gennemsnitstal 2026 · Data gemmes lokalt", en: "Based on Danish averages 2026 · Data stored locally" },

  // ─── Onboarding steps ───
  "step.household.title": { da: "Hvem er med i husstanden?", en: "Who is in the household?" },
  "step.household.subtitle": { da: "Vi tilpasser alle estimater til jeres situation.", en: "We tailor all estimates to your situation." },
  "step.household.solo": { da: "Kun mig", en: "Just me" },
  "step.household.soloSub": { da: "Enlig husstand", en: "Single household" },
  "step.household.couple": { da: "Vi er to", en: "Two of us" },
  "step.household.coupleSub": { da: "Par / samboende", en: "Couple / cohabiting" },

  "step.income.titleSolo": { da: "Hvad er din indkomst?", en: "What is your income?" },
  "step.income.titleCouple": { da: "Hvad er jeres indkomst?", en: "What is your combined income?" },
  "step.income.subtitle": { da: "Månedlig udbetalt efter skat.", en: "Monthly after-tax payout." },
  "step.income.myIncome": { da: "Månedlig indkomst", en: "Monthly income" },
  "step.income.myIncomePar": { da: "Din indkomst", en: "Your income" },
  "step.income.partnerIncome": { da: "Partners indkomst", en: "Partner's income" },
  "step.income.otherIncome": { da: "Øvrig indkomst", en: "Other income" },
  "step.income.placeholder": { da: "F.eks. Bonus, SU, børnepenge", en: "E.g. Bonus, grants, child benefits" },
  "step.income.amount": { da: "Beløb", en: "Amount" },
  "step.income.addSource": { da: "Tilføj indkomstkilde", en: "Add income source" },
  "step.income.total": { da: "Samlet indkomst", en: "Total income" },
  "step.income.tipSolo": { da: "Gennemsnitlig indkomst for enlige i Danmark er ca. 27.000 kr./md. efter skat.", en: "Average income for singles in Denmark is approx. 27,000 DKK/mo. after tax." },
  "step.income.tipCouple": { da: "Gennemsnitlig husstandsindkomst for par i Danmark er ca. 52.000 kr./md. efter skat.", en: "Average household income for couples in Denmark is approx. 52,000 DKK/mo. after tax." },

  "step.housing.title": { da: "Boligsituation", en: "Housing situation" },
  "step.housing.subtitle": { da: "Vi estimerer ud fra postnummer — justér frit.", en: "We estimate based on postal code — adjust freely." },
  "step.housing.renter": { da: "Lejer", en: "Renter" },
  "step.housing.coop": { da: "Andel", en: "Co-op" },
  "step.housing.owner": { da: "Ejer", en: "Owner" },
  "step.housing.postalCode": { da: "Postnummer", en: "Postal code" },
  "step.housing.postalPlaceholder": { da: "F.eks. 2100", en: "E.g. 2100" },
  "step.housing.rent": { da: "Månedlig husleje", en: "Monthly rent" },
  "step.housing.coopFee": { da: "Månedlig boligafgift", en: "Monthly housing fee" },
  "step.housing.coopLoan": { da: "Andelslån (afdrag + renter)", en: "Co-op loan (payments + interest)" },
  "step.housing.mortgage": { da: "Månedlig boligydelse", en: "Monthly mortgage payment" },
  "step.housing.propertyValue": { da: "Boligens estimerede værdi", en: "Estimated property value" },
  "step.housing.interestRate": { da: "Rente på lån", en: "Loan interest rate" },

  "step.children.titleSolo": { da: "Har du børn?", en: "Do you have children?" },
  "step.children.titleCouple": { da: "Har I børn?", en: "Do you have children?" },
  "step.children.subtitle": { da: "Vi finder institutionspriser automatisk.", en: "We find childcare prices automatically." },
  "step.children.no": { da: "Ingen børn", en: "No children" },
  "step.children.yes": { da: "Ja, vi har børn", en: "Yes, we have children" },
  "step.children.age": { da: "Alder for hvert barn:", en: "Age of each child:" },
  "step.children.child": { da: "Barn", en: "Child" },
  "step.children.years": { da: "år", en: "years" },
  "step.children.add": { da: "Tilføj barn", en: "Add child" },
  "step.children.tip": { da: "Institutionspriser er landsgennemsnit 2026 (kilde: KL/kommunerne). Vuggestue ca. 4.500 kr., børnehave ca. 2.600 kr., SFO ca. 2.300 kr./md. Din kommune kan afvige — ret beløbet i dashboardet.", en: "Childcare prices are national averages 2026 (source: KL/municipalities). Nursery approx. 4,500 DKK, kindergarten approx. 2,600 DKK, after-school care approx. 2,300 DKK/mo. Your municipality may differ — adjust in the dashboard." },

  "step.expenses.title": { da: "Faste udgifter", en: "Fixed expenses" },
  "step.expenses.subtitle": { da: "Vælg det der passer — vi præudfylder priserne.", en: "Select what applies — we pre-fill the prices." },
  "step.expenses.streaming": { da: "Streaming & musik", en: "Streaming & music" },
  "step.expenses.transport": { da: "Transport", en: "Transport" },
  "step.expenses.car": { da: "Bil", en: "Car" },
  "step.expenses.carLoan": { da: "Billån / leasing", en: "Car loan / leasing" },
  "step.expenses.fuel": { da: "Benzin / opladning", en: "Fuel / charging" },
  "step.expenses.carInsurance": { da: "Bilforsikring", en: "Car insurance" },
  "step.expenses.carTax": { da: "Vægtafgift / grøn ejerafgift", en: "Vehicle tax / green owner tax" },
  "step.expenses.carService": { da: "Service / værksted", en: "Service / workshop" },
  "step.expenses.insuranceUnion": { da: "Forsikring & fagforening", en: "Insurance & union" },
  "step.expenses.insurance": { da: "Forsikringer", en: "Insurance" },
  "step.expenses.insuranceSub": { da: "Indbo, ulykke, etc.", en: "Contents, accident, etc." },
  "step.expenses.union": { da: "Fagforening & A-kasse", en: "Union & unemployment fund" },
  "step.expenses.fitness": { da: "Fitness / sport", en: "Fitness / sports" },
  "step.expenses.petsLoans": { da: "Kæledyr, lån & opsparing", en: "Pets, loans & savings" },
  "step.expenses.pet": { da: "Kæledyr", en: "Pet" },
  "step.expenses.petSub": { da: "Foder, dyrlæge, forsikring", en: "Food, vet, insurance" },
  "step.expenses.loan": { da: "Lån", en: "Loan" },
  "step.expenses.loanSub": { da: "SU-lån, forbrugslån, billån", en: "Student loan, consumer loan" },
  "step.expenses.savings": { da: "Opsparing / investering", en: "Savings / investment" },
  "step.expenses.savingsSub": { da: "Fast opsparing pr. måned", en: "Monthly fixed savings" },
  "step.expenses.custom": { da: "Egne udgifter", en: "Custom expenses" },
  "step.expenses.customPlaceholder": { da: "F.eks. Kontaktlinser", en: "E.g. Contact lenses" },
  "step.expenses.seeOverview": { da: "Se overblik", en: "See overview" },

  "step.review.title": { da: "Gennemse & justér", en: "Review & adjust" },
  "step.review.subtitle": { da: "Ret alle tal til inden du går videre.", en: "Adjust all numbers before continuing." },
  "step.review.disposable": { da: "Rådighedsbeløb pr. måned", en: "Disposable income per month" },
  "step.review.good": { da: "God økonomi", en: "Good finances" },
  "step.review.tight": { da: "Slank margin", en: "Tight margin" },
  "step.review.warning": { da: "Under anbefaling", en: "Below recommendation" },
  "step.review.income": { da: "Indkomst", en: "Income" },
  "step.review.expenses": { da: "Udgifter", en: "Expenses" },
  "step.review.share": { da: "Andel", en: "Share" },
  "step.review.variableExpenses": { da: "Variable udgifter — justér til dit forbrug", en: "Variable expenses — adjust to your spending" },
  "step.review.food": { da: "Mad & dagligvarer", en: "Food & groceries" },
  "step.review.restaurant": { da: "Restaurant & takeaway", en: "Restaurant & takeaway" },
  "step.review.leisure": { da: "Fritid & oplevelser", en: "Leisure & experiences" },
  "step.review.clothing": { da: "Tøj & personlig pleje", en: "Clothing & personal care" },
  "step.review.health": { da: "Sundhed (læge, tandlæge)", en: "Health (doctor, dentist)" },
  "step.review.fixedExpenses": { da: "Faste udgifter", en: "Fixed expenses" },
  "step.review.seeDashboard": { da: "Se fuldt dashboard", en: "See full dashboard" },

  // ─── Onboarding extra ───
  "step.income.netTip": { da: "Indtast løn efter skat (netto — det du får udbetalt)", en: "Enter salary after tax (net — what you receive)" },
  "step.children.benefitTitle": { da: "Børnepenge (automatisk medregnet)", en: "Child benefits (automatically included)" },
  "step.children.benefitTotal": { da: "I alt børnepenge", en: "Total child benefits" },
  "step.expenses.utilities": { da: "Telefon, internet & forsyning", en: "Phone, internet & utilities" },
  "step.expenses.internet": { da: "Internet", en: "Internet" },
  "step.expenses.mobileSolo": { da: "Mobil", en: "Mobile" },
  "step.expenses.mobilePar": { da: "Mobil (2 pers.)", en: "Mobile (2 pers.)" },
  "step.expenses.electricity": { da: "El", en: "Electricity" },
  "step.expenses.heating": { da: "Varme & vand", en: "Heating & water" },
  "step.expenses.drLicens": { da: "DR (medielicens)", en: "DR (media license)" },
  "step.expenses.included": { da: "(inkluderet)", en: "(included)" },
  "step.expenses.utilitiesNote": { da: "Disse udgifter medregnes automatisk i dit budget.", en: "These expenses are automatically included in your budget." },

  // ─── Dashboard nav section labels ───
  "nav.cockpit": { da: "Cockpit", en: "Cockpit" },
  "nav.overview": { da: "Overblik", en: "Overview" },
  "nav.action": { da: "Handling", en: "Action" },
  "nav.future": { da: "Fremtid", en: "Future" },
  "nav.advanced": { da: "Dybdegående", en: "In-depth" },

  // ─── Frequencies ───
  "freq.monthly": { da: "Månedlig", en: "Monthly" },
  "freq.quarterly": { da: "Kvartalsvis", en: "Quarterly" },
  "freq.biannual": { da: "Halvårlig", en: "Biannual" },
  "freq.annual": { da: "Årlig", en: "Annual" },
  "freq.monthlyShort": { da: "Md.", en: "Mo." },
  "freq.quarterShort": { da: "Kvartal", en: "Quarter" },
  "freq.halfYearShort": { da: "Halvår", en: "Half year" },
  "freq.yearShort": { da: "År", en: "Year" },

  // ─── Dashboard ───
  "dash.charts": { da: "Diagrammer", en: "Charts" },
  "dash.chartsShort": { da: "Grafer", en: "Charts" },
  "dash.report": { da: "Rapport", en: "Report" },
  "dash.newCalc": { da: "Ny beregning", en: "New calculation" },
  "dash.resetShort": { da: "Nulstil", en: "Reset" },
  "dash.shareResult": { da: "Del dit resultat", en: "Share your result" },
  "dash.close": { da: "Luk", en: "Close" },
  "dash.editInfo": { da: "Ret oplysninger", en: "Edit info" },
  "dash.logOut": { da: "Log ud", en: "Log out" },
  "dash.logIn": { da: "Log ind", en: "Log in" },
  "dash.cloudSync": { da: "Log ind for at gemme dit budget på tværs af enheder", en: "Log in to save your budget across devices" },
  "dash.subscriptions": { da: "Abonnementer", en: "Subscriptions" },

  // ─── Dashboard section titles & subtitles ───
  "section.cockpit": { da: "Cockpit", en: "Cockpit" },
  "section.cockpitSub": { da: "Dit økonomiske overblik — alt på ét sted.", en: "Your financial overview — everything in one place." },
  "section.overview": { da: "Overblik", en: "Overview" },
  "section.overviewSub": { da: "Hvor går dine penge hen? Se det hele i ét blik.", en: "Where does your money go? See it all at a glance." },
  "section.action": { da: "Handling", en: "Action" },
  "section.actionSub": { da: "Konkrete besparelsesforslag baseret på dine tal.", en: "Concrete savings suggestions based on your numbers." },
  "section.future": { da: "Fremtid", en: "Future" },
  "section.futureSub": { da: "Se frem — formue, mål og tidslinje.", en: "Look ahead — wealth, goals and timeline." },
  "section.advanced": { da: "Dybdegående", en: "In-depth" },
  "section.advancedSub": { da: "Avancerede analyser og simulationer.", en: "Advanced analyses and simulations." },

  // ─── Dashboard tabs ───
  "tab.cockpit": { da: "Cockpit", en: "Cockpit" },
  "tab.forward": { da: "Fremad", en: "Forward" },
  "tab.whatIf": { da: "Hvad hvis", en: "What if" },
  "tab.stressTest": { da: "Stress-test", en: "Stress test" },
  "tab.calendar": { da: "Årshjul", en: "Calendar" },
  "tab.optimize": { da: "Optimering", en: "Optimize" },
  "tab.compare": { da: "Sammenlign", en: "Compare" },
  "tab.history": { da: "Historik", en: "History" },
  "tab.coupleSplit": { da: "Parsplit", en: "Couple split" },

  // ─── Disposable Income ───
  "health.freedom": { da: "Frihedstal", en: "Freedom number" },
  "health.freedomSub": { da: "Reelt til overs pr. md.", en: "Actually left per month" },
  "health.baseline": { da: "Baseline", en: "Baseline" },
  "health.baselineSub": { da: "Faste udgifter pr. md.", en: "Fixed expenses per month" },
  "health.buffer": { da: "Buffer", en: "Buffer" },
  "health.bufferSub": { da: "md. uden indkomst", en: "mo. without income" },

  // ─── Stress Test ───
  "stress.resilience": { da: "Modstandskraft", en: "Resilience score" },
  "stress.resilienceGood": { da: "Din økonomi kan modstå de fleste økonomiske chok. Stærk position.", en: "Your finances can withstand most economic shocks. Strong position." },
  "stress.resilienceOk": { da: "Din økonomi er sårbar over for visse scenarier. Overvej at styrke din buffer.", en: "Your finances are vulnerable to certain scenarios. Consider strengthening your buffer." },
  "stress.resilienceBad": { da: "Din økonomi er skrøbelig. Selv små ændringer kan skabe problemer. Prioritér opsparing.", en: "Your finances are fragile. Even small changes can cause problems. Prioritize savings." },
  "stress.inflation": { da: "Inflation", en: "Inflation" },
  "stress.inflationDesc": { da: "Hvad sker der, hvis priserne stiger? Variable udgifter rammes hårdest.", en: "What happens if prices rise? Variable expenses are hit hardest." },
  "stress.moderate": { da: "Moderat", en: "Moderate" },
  "stress.severe": { da: "Alvorlig", en: "Severe" },
  "stress.extreme": { da: "Ekstrem", en: "Extreme" },
  "stress.newDisposable": { da: "Nyt rådighedsbeløb", en: "New disposable" },
  "stress.impact": { da: "Effekt", en: "Impact" },
  "stress.rateHike": { da: "Rentestigning", en: "Rate hike" },
  "stress.rateHikeDesc": { da: "Hvad sker der, hvis renten stiger? Påvirker dit boliglån direkte.", en: "What happens if interest rates rise? Directly affects your mortgage." },
  "stress.mortgageUp": { da: "Boliglån stiger", en: "Mortgage increase" },
  "stress.jobLoss": { da: "Jobmistelse", en: "Job loss" },
  "stress.jobLossDesc": { da: "Hvad sker der, hvis din indkomst falder? Vi beregner med og uden dagpenge.", en: "What happens if your income drops? We calculate with and without unemployment benefits." },
  "stress.withoutHelp": { da: "Uden dagpenge", en: "Without benefits" },
  "stress.withDagpenge": { da: "Med dagpenge", en: "With benefits" },
  "stress.survivalTime": { da: "Overlevelsestid", en: "Survival time" },
  "stress.months": { da: "måneder", en: "months" },
  "stress.monthsShort": { da: "md.", en: "mo." },
  "stress.withSavings": { da: "med nuværende opsparing", en: "with current savings" },
  "stress.worstCase": { da: "Worst case: Alt på én gang", en: "Worst case: Everything at once" },
  "stress.worstCaseDesc": { da: "Inflation + rentestigning + indkomstfald. Dit budget under maksimalt pres.", en: "Inflation + rate hike + income drop. Your budget under maximum pressure." },
  "stress.disclaimer": { da: "Stress-testen er et estimat. Kontakt din bank for præcis beregning.", en: "The stress test is an estimate. Contact your bank for exact calculations." },

  // ─── Årshjul ───
  "wheel.annual": { da: "Årlige udgifter", en: "Annual expenses" },
  "wheel.annualSub": { da: "Store udgifter du skal forberede dig på i løbet af året", en: "Large expenses you need to prepare for throughout the year" },
  "wheel.monthlyOverview": { da: "Månedsvisning", en: "Monthly overview" },
  "wheel.upcoming": { da: "Kommende udgifter", en: "Upcoming expenses" },
  "wheel.fullYear": { da: "Hele året", en: "Full year" },
  "wheel.now": { da: "Nu", en: "Now" },
  "wheel.carInsurance": { da: "Bilforsikring", en: "Car insurance" },
  "wheel.carTax": { da: "Vægtafgift", en: "Vehicle tax" },
  "wheel.carService": { da: "Bilservice", en: "Car service" },
  "wheel.propertyTax": { da: "Ejendomsskat", en: "Property tax" },
  "wheel.insuranceRenewal": { da: "Forsikring (fornyelse)", en: "Insurance (renewal)" },
  "wheel.christmas": { da: "Jul & gaver", en: "Christmas & gifts" },
  "wheel.summerVacation": { da: "Sommerferie", en: "Summer vacation" },
  "wheel.taxSettlement": { da: "Restskat / overskydende", en: "Tax settlement" },
  "wheel.backToSchool": { da: "Skolestart", en: "Back to school" },
  "wheel.birthdays": { da: "Fødselsdage", en: "Birthdays" },
  "wheel.disclaimer": { da: "Beløbene er estimater baseret på danske gennemsnit.", en: "Amounts are estimates based on Danish averages." },

  // ─── Social Proof Nudges ───
  "nudge.savingsAbove": { da: "Din opsparingsrate ({pct}) ligger over gennemsnittet ({avg}) for lignende husstande 💪", en: "Your savings rate ({pct}) is above average ({avg}) for similar households 💪" },
  "nudge.savingsBelow": { da: "De fleste lignende husstande sparer mindst {avg} af deres indkomst op", en: "Most similar households save at least {avg} of their income" },
  "nudge.streaming": { da: "Du har {count} streamingtjenester — 67% af danske husstande har maks 2", en: "You have {count} streaming services — 67% of Danish households have max 2" },
  "nudge.foodAbove": { da: "Dit madbudget er {pct}% over gennemsnittet for lignende husstande", en: "Your food budget is {pct}% above average for similar households" },
  "nudge.foodBelow": { da: "Dit madbudget er under gennemsnittet — godt klaret! 🥗", en: "Your food budget is below average — well done! 🥗" },
  "nudge.topPercentile": { da: "Dit rådighedsbeløb er i top {pct}% blandt lignende husstande", en: "Your disposable income is in the top {pct}% among similar households" },
  "nudge.housingHigh": { da: "Din boligudgift udgør {pct}% af indkomsten — eksperter anbefaler maks 33%", en: "Your housing cost is {pct}% of income — experts recommend max 33%" },
  "nudge.healthTop": { da: "Din sundhedsscore er i top-25 — du er bedre stillet end de fleste", en: "Your health score is in the top 25 — you're better off than most" },

  // ─── Cookie banner ───
  "cookie.text": { da: "Vi bruger cookies til at gemme dine præferencer lokalt. Ingen data sendes til tredjeparter.", en: "We use cookies to store your preferences locally. No data is sent to third parties." },
  "cookie.readMore": { da: "Læs mere", en: "Read more" },
  "cookie.accept": { da: "Acceptér", en: "Accept" },
  "cookie.decline": { da: "Afvis", en: "Decline" },

  // ─── Generic ───
  "continue": { da: "Fortsæt", en: "Continue" },
  "currency": { da: "kr.", en: "DKK" },
  "perMonth": { da: "kr./md.", en: "DKK/mo." },
  "perYear": { da: "kr./år", en: "DKK/yr." },
  "perHalfYear": { da: "kr./halvår", en: "DKK/half yr." },
};

// ─── Context ─────────────────────────────────────────────────

const I18nContext = createContext<I18nContextType>({
  lang: "da",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "da") return saved;
    } catch {}
    return "da";
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
