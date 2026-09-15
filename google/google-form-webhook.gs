/**
 * Google Form -> ANVATION Admin Portal
 * =====================================
 * SETUP (one time):
 *   1. Google Form -> Responses tab -> "Link to Sheets".
 *   2. In that spreadsheet: Extensions -> Apps Script.
 *      Replace ALL existing content with this file. Save (Ctrl+S).
 *   3. Set GOOGLE_FORM_WEBHOOK_URL to your Vercel deployment URL.
 *   4. Set GOOGLE_FORM_WEBHOOK_SECRET to match the Vercel env var.
 *   5. Save, then Run -> onFormSubmit once to authorize permissions.
 *   6. Triggers -> Add Trigger -> onFormSubmit, From spreadsheet, On form submit.
 *   7. Submit a test response; check Executions log for status 201.
 */

var GOOGLE_FORM_WEBHOOK_URL = 'https://anvation-cse.vercel.app/api/google-form/webhook';
var GOOGLE_FORM_WEBHOOK_SECRET = 'anvation-webhook-secret-2026';

// ---------------------------------------------------------------------------
// FIELD MAP — exact column headers from your Google Sheet
// Keys = exact column header, Values = canonical field (do not change values)
// ---------------------------------------------------------------------------
var FIELD_MAP = {
  // Team info
  'Team Name':                                                        'teamName',
  'Select the Domain':                                                'domain',
  'College ':                                                         'college',
  'City':                                                             'city',
  'States':                                                           'leader.state',
  'Do you require accommodation?\n(accommodation will be provided based on verifying the details and availability only for NON-BENGALURU participants)': 'accommodation',

  // Team Leader
  'Team Leader Full Name  \n(Note :This name will appear on the certificate)': 'leader.fullName',
  'Team Leader Email ID':                                             'leader.email',
  'Team Leader WhatsApp Number ':                                     'leader.phone',
  'Team Leader Gender  ':                                             'leader.gender',

  // Payment
  ' Transaction ID / UTR Number  ':                                   'paymentUtr',

  // Participant 2
  'Participant 2 Full Name  \n(Note :This name will appear on the certificate)': 'members.1.fullName',
  'Participant 2 Email ID':                                           'members.1.email',
  'Participant 2 Phone Number  ':                                     'members.1.phone',
  'Participant 2 Gender ':                                            'members.1.gender',

  // Participant 3
  'Participant 3 Full Name  \n(Note :This name will appear on the certificate)': 'members.2.fullName',
  'Participant 3 Email ID':                                           'members.2.email',
  'Participant 3 Phone Number  ':                                     'members.2.phone',
  'Participant 3 Gender ':                                            'members.2.gender',

  // Participant 4
  'Participant 4 Full Name  \n(Note :This name will appear on the certificate)': 'members.3.fullName',
  'Participant 4 Email ID':                                           'members.3.email',
  'Participant 4 Phone Number  ':                                     'members.3.phone',
  'Participant 4 Gender  ':                                           'members.3.gender'
};

// ---------------------------------------------------------------------------
// TRIGGER
// ---------------------------------------------------------------------------
function onFormSubmit(e) {
  try {
    var namedValues = (e && e.namedValues) ? e.namedValues : {};
    var submissionId = (e && e.response && typeof e.response.getId === 'function')
      ? e.response.getId()
      : ('sub-' + Date.now());

    var payload = buildPayload(namedValues, submissionId);

    // Validate minimum required fields before sending
    if (!payload.teamName || !payload.leader.email || !payload.leader.fullName) {
      Logger.log('[ANVATION] Skipping — missing required fields. teamName=' + payload.teamName + ' leaderEmail=' + payload.leader.email);
      return;
    }

    var response = UrlFetchApp.fetch(GOOGLE_FORM_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-webhook-secret': GOOGLE_FORM_WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log('[ANVATION] ' + code + ': ' + body);

    if (code === 201) {
      Logger.log('[ANVATION] Registered: ' + payload.teamName + ' / ' + payload.leader.email);
    } else if (code === 200) {
      Logger.log('[ANVATION] Duplicate — already registered.');
    } else {
      Logger.log('[ANVATION] Unexpected status ' + code);
    }
  } catch (err) {
    Logger.log('[ANVATION] Error: ' + err.toString());
  }
}

// ---------------------------------------------------------------------------
// PAYLOAD BUILDER
// ---------------------------------------------------------------------------
function buildPayload(named, submissionId) {
  function val(canonicalKey) {
    for (var col in FIELD_MAP) {
      if (FIELD_MAP[col] === canonicalKey) {
        var arr = named[col];
        if (arr && arr.length && String(arr[0]).trim()) {
          return String(arr[0]).trim();
        }
      }
    }
    return '';
  }

  // College is shared for all members — read once
  var college = val('college');
  var city    = val('city');

  function member(n) {
    var fullName = val('members.' + n + '.fullName');
    var email    = val('members.' + n + '.email');
    if (!fullName && !email) return null;
    return {
      fullName: fullName,
      email:    email,
      phone:    val('members.' + n + '.phone'),
      usn:      '',
      college:  college,
      state:    val('leader.state'),
      gender:   val('members.' + n + '.gender')
    };
  }

  var members = [];
  for (var i = 1; i <= 3; i++) {
    var m = member(i);
    if (m) members.push(m);
  }

  var accommodation = val('accommodation');

  return {
    submissionId: String(submissionId),
    source:       'google_form',
    teamName:     val('teamName'),
    domain:       val('domain'),
    paymentUtr:   val('paymentUtr'),
    leader: {
      fullName:             val('leader.fullName'),
      email:                val('leader.email'),
      phone:                val('leader.phone'),
      usn:                  '',
      college:              college,
      city:                 city,
      state:                val('leader.state'),
      gender:               val('leader.gender'),
      accommodationRequired: accommodation === 'Yes'
    },
    members: members
  };
}
