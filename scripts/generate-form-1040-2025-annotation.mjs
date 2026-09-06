import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const projectRoot = process.cwd()
const templatePath = resolve(
  projectRoot,
  'examples/templates/f1040-2025.pdf',
)
const annotationPath = resolve(
  projectRoot,
  'examples/annotations/form-1040-2025.annotation.json',
)
const dataRoot = '/returns/federal/2025'

const textFormat = { type: 'text', trim: true, case: 'preserve' }
const moneyFormat = {
  type: 'money',
  decimalPlaces: 0,
  useThousandsSeparator: true,
  showCurrencySymbol: false,
  currencySymbol: '$',
  negativeStyle: 'minus',
}
const checkboxFormat = { type: 'checkbox', trueMark: 'X', falseMark: '' }
const rightAligned = { horizontalAlign: 'right' }
const centeredCheckbox = {
  fontSizePt: 8,
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  paddingPt: 0,
}

function field(page, widgetPath, id, label, pointer, format, options = {}) {
  return {
    page,
    widgetName: `topmostSubform[0].Page${page}[0].${widgetPath}`,
    id,
    label,
    pointer: `${dataRoot}${pointer}`,
    format,
    ...options,
  }
}

function text(page, widgetPath, id, label, pointer, options) {
  return field(page, widgetPath, id, label, pointer, textFormat, options)
}

function money(page, widgetPath, id, label, pointer, options = {}) {
  return field(page, widgetPath, id, label, pointer, moneyFormat, {
    style: rightAligned,
    ...options,
  })
}

function checkbox(page, widgetPath, id, label, pointer, options = {}) {
  return field(page, widgetPath, id, label, pointer, checkboxFormat, {
    style: centeredCheckbox,
    ...options,
  })
}

function identifier(
  page,
  widgetPath,
  id,
  label,
  pointer,
  placeholderCount,
  options = {},
) {
  return field(
    page,
    widgetPath,
    id,
    label,
    pointer,
    {
      type: 'masked-identifier',
      mask: '#'.repeat(placeholderCount),
      placeholder: '#',
    },
    options,
  )
}

const fieldDefinitions = [
  text(
    1,
    'f1_14[0]',
    'form1040.taxpayer.firstAndMiddleInitial',
    'Taxpayer first name and middle initial',
    '/taxpayer/identity/legalName/firstAndMiddleInitial',
  ),
  text(
    1,
    'f1_15[0]',
    'form1040.taxpayer.lastName',
    'Taxpayer last name',
    '/taxpayer/identity/legalName/last',
  ),
  identifier(
    1,
    'f1_16[0]',
    'form1040.taxpayer.ssn',
    'Taxpayer Social Security number',
    '/taxpayer/identity/ssn',
    9,
    {
      behavior: { onMissing: 'error' },
      boxOverride: {
        x: 0.764208,
        y: 0.118686,
        width: 0.159912,
        height: 0.017678,
      },
      style: { horizontalAlign: 'center' },
    },
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_20[0]',
    'form1040.taxpayer.address.street',
    'Home address',
    '/taxpayer/address/street',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_21[0]',
    'form1040.taxpayer.address.apartment',
    'Apartment number',
    '/taxpayer/address/apartment',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_22[0]',
    'form1040.taxpayer.address.city',
    'City, town, or post office',
    '/taxpayer/address/city',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_23[0]',
    'form1040.taxpayer.address.state',
    'State',
    '/taxpayer/address/state',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_24[0]',
    'form1040.taxpayer.address.zipCode',
    'ZIP code',
    '/taxpayer/address/zipCode',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_25[0]',
    'form1040.taxpayer.address.foreignCountryName',
    'Foreign country name',
    '/taxpayer/address/foreignCountryName',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_26[0]',
    'form1040.taxpayer.address.foreignProvince',
    'Foreign province, state, or county',
    '/taxpayer/address/foreignProvince',
  ),
  text(
    1,
    'Address_ReadOrder[0].f1_27[0]',
    'form1040.taxpayer.address.foreignPostalCode',
    'Foreign postal code',
    '/taxpayer/address/foreignPostalCode',
  ),
  checkbox(
    1,
    'c1_6[0]',
    'form1040.presidentialElectionCampaign.taxpayer',
    'Presidential Election Campaign: taxpayer',
    '/taxpayer/presidentialElectionCampaign',
  ),
  checkbox(
    1,
    'Checkbox_ReadOrder[0].c1_8[0]',
    'form1040.filingStatus.single',
    'Filing status: single',
    '/taxpayer/filingStatus/single',
  ),
  checkbox(
    1,
    'c1_8[0]',
    'form1040.filingStatus.marriedFilingJointly',
    'Filing status: married filing jointly',
    '/taxpayer/filingStatus/marriedFilingJointly',
  ),
  checkbox(
    1,
    'Checkbox_ReadOrder[0].c1_8[1]',
    'form1040.filingStatus.marriedFilingSeparately',
    'Filing status: married filing separately',
    '/taxpayer/filingStatus/marriedFilingSeparately',
  ),
  checkbox(
    1,
    'c1_8[1]',
    'form1040.filingStatus.headOfHousehold',
    'Filing status: head of household',
    '/taxpayer/filingStatus/headOfHousehold',
  ),
  checkbox(
    1,
    'Checkbox_ReadOrder[0].c1_8[2]',
    'form1040.filingStatus.qualifyingSurvivingSpouse',
    'Filing status: qualifying surviving spouse',
    '/taxpayer/filingStatus/qualifyingSurvivingSpouse',
  ),
  text(
    1,
    'f1_29[0]',
    'form1040.filingStatus.qualifyingPersonName',
    'Qualifying person name',
    '/taxpayer/filingStatus/qualifyingPersonName',
  ),
  checkbox(
    1,
    'c1_9[0]',
    'form1040.filingStatus.nonresidentAlienSpouse',
    'Nonresident alien spouse election',
    '/taxpayer/filingStatus/nonresidentAlienSpouse',
  ),
  checkbox(
    1,
    'c1_10[0]',
    'form1040.digitalAssets.yes',
    'Digital assets: yes',
    '/taxpayer/digitalAssets/receivedOrDisposed',
  ),
  checkbox(
    1,
    'c1_10[1]',
    'form1040.digitalAssets.no',
    'Digital assets: no',
    '/taxpayer/digitalAssets/didNotReceiveOrDispose',
  ),
  text(
    1,
    'Table_Dependents[0].Row1[0].f1_31[0]',
    'form1040.dependents.0.firstName',
    'Dependent 1 first name',
    '/dependents/0/legalName/first',
  ),
  text(
    1,
    'Table_Dependents[0].Row2[0].f1_35[0]',
    'form1040.dependents.0.lastName',
    'Dependent 1 last name',
    '/dependents/0/legalName/last',
  ),
  identifier(
    1,
    'Table_Dependents[0].Row3[0].f1_39[0]',
    'form1040.dependents.0.ssn',
    'Dependent 1 Social Security number',
    '/dependents/0/ssn',
    9,
  ),
  text(
    1,
    'Table_Dependents[0].Row4[0].f1_43[0]',
    'form1040.dependents.0.relationship',
    'Dependent 1 relationship',
    '/dependents/0/relationship',
  ),
  checkbox(
    1,
    'Table_Dependents[0].Row7[0].Dependent1[0].c1_28[0]',
    'form1040.dependents.0.childTaxCredit',
    'Dependent 1 qualifies for child tax credit',
    '/dependents/0/qualifiesForChildTaxCredit',
  ),
  checkbox(
    1,
    'Table_Dependents[0].Row7[0].Dependent1[0].c1_28[1]',
    'form1040.dependents.0.otherDependentCredit',
    'Dependent 1 qualifies for credit for other dependents',
    '/dependents/0/qualifiesForCreditForOtherDependents',
  ),
  money(1, 'f1_47[0]', 'form1040.line1a.wages', 'Line 1a wages', '/income/wages'),
  money(
    1,
    'f1_48[0]',
    'form1040.line1b.householdEmployeeWages',
    'Line 1b household employee wages',
    '/income/householdEmployeeWages',
  ),
  money(
    1,
    'f1_49[0]',
    'form1040.line1c.tipIncomeNotReported',
    'Line 1c tip income not reported',
    '/income/tipIncomeNotReported',
  ),
  money(
    1,
    'f1_50[0]',
    'form1040.line1d.medicaidWaiverPayments',
    'Line 1d Medicaid waiver payments',
    '/income/medicaidWaiverPayments',
  ),
  money(
    1,
    'f1_51[0]',
    'form1040.line1e.dependentCareBenefits',
    'Line 1e dependent care benefits',
    '/income/dependentCareBenefits',
  ),
  money(
    1,
    'f1_52[0]',
    'form1040.line1f.employerAdoptionBenefits',
    'Line 1f employer adoption benefits',
    '/income/employerAdoptionBenefits',
  ),
  money(
    1,
    'f1_53[0]',
    'form1040.line1g.wagesFromForm8919',
    'Line 1g wages from Form 8919',
    '/income/wagesFromForm8919',
  ),
  money(
    1,
    'f1_55[0]',
    'form1040.line1h.otherEarnedIncome',
    'Line 1h other earned income',
    '/income/otherEarnedIncome',
  ),
  money(
    1,
    'f1_56[0]',
    'form1040.line1i.nontaxableCombatPay',
    'Line 1i nontaxable combat pay election',
    '/income/nontaxableCombatPay',
  ),
  money(
    1,
    'f1_57[0]',
    'form1040.line1z.totalWages',
    'Line 1z total wages',
    '/income/totalWages',
  ),
  money(
    1,
    'f1_58[0]',
    'form1040.line2a.taxExemptInterest',
    'Line 2a tax-exempt interest',
    '/income/taxExemptInterest',
  ),
  money(
    1,
    'f1_59[0]',
    'form1040.line2b.taxableInterest',
    'Line 2b taxable interest',
    '/income/taxableInterest',
  ),
  money(
    1,
    'f1_60[0]',
    'form1040.line3a.qualifiedDividends',
    'Line 3a qualified dividends',
    '/income/qualifiedDividends',
  ),
  money(
    1,
    'f1_61[0]',
    'form1040.line3b.ordinaryDividends',
    'Line 3b ordinary dividends',
    '/income/ordinaryDividends',
  ),
  money(
    1,
    'f1_62[0]',
    'form1040.line4a.iraDistributions',
    'Line 4a IRA distributions',
    '/income/iraDistributions',
  ),
  money(
    1,
    'f1_63[0]',
    'form1040.line4b.iraDistributionsTaxable',
    'Line 4b taxable IRA distributions',
    '/income/iraDistributionsTaxable',
  ),
  money(
    1,
    'f1_65[0]',
    'form1040.line5a.pensionsAndAnnuities',
    'Line 5a pensions and annuities',
    '/income/pensionsAndAnnuities',
  ),
  money(
    1,
    'f1_66[0]',
    'form1040.line5b.pensionsAndAnnuitiesTaxable',
    'Line 5b taxable pensions and annuities',
    '/income/pensionsAndAnnuitiesTaxable',
  ),
  money(
    1,
    'f1_68[0]',
    'form1040.line6a.socialSecurityBenefits',
    'Line 6a Social Security benefits',
    '/income/socialSecurityBenefits',
  ),
  money(
    1,
    'f1_69[0]',
    'form1040.line6b.socialSecurityBenefitsTaxable',
    'Line 6b taxable Social Security benefits',
    '/income/socialSecurityBenefitsTaxable',
  ),
  checkbox(
    1,
    'c1_41[0]',
    'form1040.line6c.usedLumpSumElection',
    'Line 6c lump-sum election',
    '/income/usedLumpSumElection',
  ),
  money(
    1,
    'f1_70[0]',
    'form1040.line7a.capitalGainOrLoss',
    'Line 7a capital gain or loss',
    '/income/capitalGainOrLoss',
  ),
  checkbox(
    1,
    'c1_43[0]',
    'form1040.line7b.scheduleDNotRequired',
    'Line 7b Schedule D not required',
    '/income/scheduleDNotRequired',
  ),
  money(
    1,
    'f1_72[0]',
    'form1040.line8.additionalIncome',
    'Line 8 additional income from Schedule 1',
    '/income/additionalIncomeFromSchedule1',
  ),
  money(
    1,
    'f1_73[0]',
    'form1040.line9.totalIncome',
    'Line 9 total income',
    '/income/totalIncome',
  ),
  money(
    1,
    'f1_74[0]',
    'form1040.line10.adjustments',
    'Line 10 adjustments to income',
    '/adjustments/fromSchedule1',
  ),
  money(
    1,
    'f1_75[0]',
    'form1040.line11a.adjustedGrossIncome',
    'Line 11a adjusted gross income',
    '/adjustments/adjustedGrossIncome',
  ),
  money(
    2,
    'f2_01[0]',
    'form1040.line11b.adjustedGrossIncome',
    'Line 11b adjusted gross income',
    '/adjustments/adjustedGrossIncome',
  ),
  checkbox(
    2,
    'c2_1[0]',
    'form1040.line12a.someoneCanClaimTaxpayer',
    'Line 12a someone can claim taxpayer',
    '/taxpayer/standardDeduction/someoneCanClaimYou',
  ),
  checkbox(
    2,
    'c2_2[0]',
    'form1040.line12a.someoneCanClaimSpouse',
    'Line 12a someone can claim spouse',
    '/taxpayer/standardDeduction/someoneCanClaimSpouse',
  ),
  checkbox(
    2,
    'c2_3[0]',
    'form1040.line12b.spouseItemizesSeparately',
    'Line 12b spouse itemizes separately',
    '/taxpayer/standardDeduction/spouseItemizesSeparately',
  ),
  checkbox(
    2,
    'c2_5[0]',
    'form1040.line12d.taxpayerBornBefore1961',
    'Line 12d taxpayer born before January 2, 1961',
    '/taxpayer/ageAndBlindness/bornBeforeJanuary2Of1961',
  ),
  checkbox(
    2,
    'c2_6[0]',
    'form1040.line12d.taxpayerBlind',
    'Line 12d taxpayer is blind',
    '/taxpayer/ageAndBlindness/isBlind',
  ),
  money(
    2,
    'f2_02[0]',
    'form1040.line12e.standardOrItemizedDeduction',
    'Line 12e standard or itemized deduction',
    '/deductions/standardOrItemized',
  ),
  money(
    2,
    'f2_03[0]',
    'form1040.line13a.qualifiedBusinessIncomeDeduction',
    'Line 13a qualified business income deduction',
    '/deductions/qualifiedBusinessIncome',
  ),
  money(
    2,
    'f2_05[0]',
    'form1040.line14.totalDeductions',
    'Line 14 total deductions',
    '/deductions/totalDeductions',
  ),
  money(
    2,
    'f2_06[0]',
    'form1040.line15.taxableIncome',
    'Line 15 taxable income',
    '/deductions/taxableIncome',
  ),
  checkbox(
    2,
    'c2_9[0]',
    'form1040.line16.usedForm8814',
    'Line 16 includes Form 8814',
    '/taxAndCredits/usedForm8814',
  ),
  checkbox(
    2,
    'c2_10[0]',
    'form1040.line16.usedForm4972',
    'Line 16 includes Form 4972',
    '/taxAndCredits/usedForm4972',
  ),
  money(2, 'f2_08[0]', 'form1040.line16.tax', 'Line 16 tax', '/taxAndCredits/tax'),
  money(
    2,
    'f2_09[0]',
    'form1040.line17.schedule2Tax',
    'Line 17 amount from Schedule 2',
    '/taxAndCredits/amountFromSchedule2',
  ),
  money(
    2,
    'f2_10[0]',
    'form1040.line18.totalTaxBeforeCredits',
    'Line 18 total tax before credits',
    '/taxAndCredits/totalTaxBeforeCredits',
  ),
  money(
    2,
    'f2_11[0]',
    'form1040.line19.childTaxCreditOrOtherDependents',
    'Line 19 child tax credit or credit for other dependents',
    '/taxAndCredits/childTaxCreditOrOtherDependents',
  ),
  money(
    2,
    'f2_12[0]',
    'form1040.line20.schedule3Credit',
    'Line 20 amount from Schedule 3',
    '/taxAndCredits/amountFromSchedule3',
  ),
  money(
    2,
    'f2_13[0]',
    'form1040.line21.totalCredits',
    'Line 21 total credits',
    '/taxAndCredits/totalCredits',
  ),
  money(
    2,
    'f2_14[0]',
    'form1040.line22.taxLessCredits',
    'Line 22 tax less credits',
    '/taxAndCredits/taxLessCredits',
  ),
  money(
    2,
    'f2_15[0]',
    'form1040.line23.otherTaxes',
    'Line 23 other taxes',
    '/taxAndCredits/otherTaxesFromSchedule2',
  ),
  money(
    2,
    'f2_16[0]',
    'form1040.line24.totalTax',
    'Line 24 total tax',
    '/taxAndCredits/totalTax',
  ),
  money(
    2,
    'f2_17[0]',
    'form1040.line25a.withholdingFromW2',
    'Line 25a withholding from Forms W-2',
    '/payments/withholdingFromW2',
  ),
  money(
    2,
    'f2_18[0]',
    'form1040.line25b.withholdingFrom1099',
    'Line 25b withholding from Forms 1099',
    '/payments/withholdingFrom1099',
  ),
  money(
    2,
    'f2_19[0]',
    'form1040.line25c.withholdingFromOtherForms',
    'Line 25c withholding from other forms',
    '/payments/withholdingFromOtherForms',
  ),
  money(
    2,
    'f2_20[0]',
    'form1040.line25d.totalWithholding',
    'Line 25d total withholding',
    '/payments/totalWithholding',
  ),
  money(
    2,
    'f2_21[0]',
    'form1040.line26.estimatedTaxPayments',
    'Line 26 estimated tax payments',
    '/payments/estimatedTaxPayments',
  ),
  money(
    2,
    'f2_23[0]',
    'form1040.line27a.earnedIncomeCredit',
    'Line 27a earned income credit',
    '/payments/earnedIncomeCredit',
  ),
  money(
    2,
    'f2_24[0]',
    'form1040.line28.additionalChildTaxCredit',
    'Line 28 additional child tax credit',
    '/payments/additionalChildTaxCredit',
  ),
  money(
    2,
    'f2_25[0]',
    'form1040.line29.americanOpportunityCredit',
    'Line 29 American opportunity credit',
    '/payments/americanOpportunityCredit',
  ),
  money(
    2,
    'f2_27[0]',
    'form1040.line31.otherPaymentsFromSchedule3',
    'Line 31 amount from Schedule 3',
    '/payments/otherPaymentsFromSchedule3',
  ),
  money(
    2,
    'f2_28[0]',
    'form1040.line32.totalOtherPayments',
    'Line 32 total other payments and refundable credits',
    '/payments/totalOtherPayments',
  ),
  money(
    2,
    'f2_29[0]',
    'form1040.line33.totalPayments',
    'Line 33 total payments',
    '/payments/totalPayments',
  ),
  money(
    2,
    'f2_30[0]',
    'form1040.line34.overpaidAmount',
    'Line 34 amount overpaid',
    '/refund/overpaidAmount',
  ),
  money(
    2,
    'f2_31[0]',
    'form1040.line35a.refundAmount',
    'Line 35a refund amount',
    '/refund/refundAmount',
  ),
  identifier(
    2,
    'RoutingNo[0].f2_32[0]',
    'form1040.line35b.routingNumber',
    'Line 35b routing number',
    '/refund/directDeposit/routingNumber',
    9,
  ),
  checkbox(
    2,
    'c2_16[0]',
    'form1040.line35c.checkingAccount',
    'Line 35c checking account',
    '/refund/directDeposit/isChecking',
  ),
  checkbox(
    2,
    'c2_16[1]',
    'form1040.line35c.savingsAccount',
    'Line 35c savings account',
    '/refund/directDeposit/isSavings',
  ),
  identifier(
    2,
    'AccountNo[0].f2_33[0]',
    'form1040.line35d.accountNumber',
    'Line 35d account number',
    '/refund/directDeposit/accountNumber',
    11,
  ),
  money(
    2,
    'f2_34[0]',
    'form1040.line36.appliedToEstimatedTax',
    'Line 36 applied to estimated tax',
    '/refund/appliedToEstimatedTax',
  ),
  money(
    2,
    'f2_35[0]',
    'form1040.line37.amountOwed',
    'Line 37 amount owed',
    '/summary/amountOwed',
  ),
  money(
    2,
    'f2_36[0]',
    'form1040.line38.estimatedTaxPenalty',
    'Line 38 estimated tax penalty',
    '/summary/estimatedTaxPenalty',
  ),
  checkbox(
    2,
    'c2_17[0]',
    'form1040.thirdPartyDesignee.yes',
    'Allow third-party designee: yes',
    '/thirdPartyDesignee/allowDiscussion',
  ),
  checkbox(
    2,
    'c2_17[1]',
    'form1040.thirdPartyDesignee.no',
    'Allow third-party designee: no',
    '/thirdPartyDesignee/doNotAllowDiscussion',
  ),
  text(
    2,
    'f2_37[0]',
    'form1040.thirdPartyDesignee.name',
    'Third-party designee name',
    '/thirdPartyDesignee/name',
  ),
  text(
    2,
    'f2_38[0]',
    'form1040.thirdPartyDesignee.phone',
    'Third-party designee phone number',
    '/thirdPartyDesignee/phone',
  ),
  identifier(
    2,
    'f2_39[0]',
    'form1040.thirdPartyDesignee.pin',
    'Third-party designee PIN',
    '/thirdPartyDesignee/personalIdentificationNumber',
    5,
  ),
  text(
    2,
    'f2_40[0]',
    'form1040.signature.taxpayerOccupation',
    'Taxpayer occupation',
    '/signature/taxpayerOccupation',
  ),
  identifier(
    2,
    'f2_41[0]',
    'form1040.signature.taxpayerIdentityProtectionPin',
    'Taxpayer identity protection PIN',
    '/taxpayer/identity/identityProtectionPin',
    6,
  ),
  text(
    2,
    'f2_44[0]',
    'form1040.signature.phone',
    'Taxpayer phone number',
    '/taxpayer/identity/phone',
  ),
  text(
    2,
    'f2_45[0]',
    'form1040.signature.email',
    'Taxpayer email address',
    '/taxpayer/identity/email',
  ),
  text(
    2,
    'f2_46[0]',
    'form1040.paidPreparer.name',
    'Paid preparer name',
    '/paidPreparer/name',
  ),
  text(
    2,
    'f2_47[0]',
    'form1040.paidPreparer.ptin',
    'Paid preparer PTIN',
    '/paidPreparer/ptin',
  ),
  checkbox(
    2,
    'c2_18[0]',
    'form1040.paidPreparer.selfEmployed',
    'Paid preparer is self-employed',
    '/paidPreparer/isSelfEmployed',
  ),
  text(
    2,
    'f2_48[0]',
    'form1040.paidPreparer.firmName',
    'Paid preparer firm name',
    '/paidPreparer/firmName',
  ),
  text(
    2,
    'f2_49[0]',
    'form1040.paidPreparer.firmPhone',
    'Paid preparer firm phone number',
    '/paidPreparer/firmPhone',
  ),
  text(
    2,
    'f2_50[0]',
    'form1040.paidPreparer.firmAddress',
    'Paid preparer firm address',
    '/paidPreparer/firmAddress',
  ),
  identifier(
    2,
    'f2_51[0]',
    'form1040.paidPreparer.firmEin',
    'Paid preparer firm EIN',
    '/paidPreparer/firmEin',
    9,
  ),
]

function normalizedWidgetBox(annotation, viewport) {
  const rectangle = viewport.convertToViewportRectangle(annotation.rect)
  const [x1, y1, x2, y2] = rectangle

  return {
    x: round(Math.min(x1, x2) / viewport.width),
    y: round(Math.min(y1, y2) / viewport.height),
    width: round(Math.abs(x2 - x1) / viewport.width),
    height: round(Math.abs(y2 - y1) / viewport.height),
  }
}

function round(value) {
  return Number(value.toFixed(9))
}

async function readWidgetsByName(templateBytes) {
  const document = await getDocument({
    data: Uint8Array.from(templateBytes),
  }).promise
  const widgetsByName = new Map()

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })

      for (const annotation of await page.getAnnotations()) {
        if (annotation.subtype !== 'Widget' || annotation.fieldName === undefined) {
          continue
        }

        if (widgetsByName.has(annotation.fieldName)) {
          throw new Error(`Duplicate PDF widget name: ${annotation.fieldName}`)
        }

        widgetsByName.set(annotation.fieldName, {
          page: pageNumber,
          box: normalizedWidgetBox(annotation, viewport),
          characterCells:
            annotation.comb === true ? annotation.maxLen : undefined,
        })
      }

      page.cleanup()
    }
  } finally {
    await document.destroy()
  }

  return widgetsByName
}

function createAnnotationField(definition, widget) {
  if (widget.page !== definition.page) {
    throw new Error(`PDF widget is on the wrong page: ${definition.widgetName}`)
  }

  const style = {
    ...definition.style,
    ...(widget.characterCells === undefined
      ? {}
      : { characterCells: widget.characterCells }),
  }

  return {
    id: definition.id,
    label: definition.label,
    ...(definition.description === undefined
      ? {}
      : { description: definition.description }),
    page: definition.page,
    source: { kind: 'json-pointer', pointer: definition.pointer },
    box: definition.boxOverride ?? widget.box,
    format: definition.format,
    ...(Object.keys(style).length === 0 ? {} : { style }),
    ...(definition.behavior === undefined
      ? {}
      : { behavior: definition.behavior }),
  }
}

async function main() {
  const [templateBytes, existingAnnotationText] = await Promise.all([
    readFile(templatePath),
    readFile(annotationPath, 'utf8'),
  ])
  const annotation = JSON.parse(existingAnnotationText)
  const widgetsByName = await readWidgetsByName(templateBytes)
  const duplicateIds = fieldDefinitions
    .map(({ id }) => id)
    .filter((id, index, ids) => ids.indexOf(id) !== index)

  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate annotation field IDs: ${duplicateIds.join(', ')}`)
  }

  annotation.fields = fieldDefinitions.map((definition) => {
    const widget = widgetsByName.get(definition.widgetName)

    if (widget === undefined) {
      throw new Error(`PDF widget was not found: ${definition.widgetName}`)
    }

    return createAnnotationField(definition, widget)
  })

  await writeFile(annotationPath, `${JSON.stringify(annotation, null, 2)}\n`)
  console.log(`Generated ${annotation.fields.length} Form 1040 annotations.`)
}

await main()
