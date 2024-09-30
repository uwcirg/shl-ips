import config from "./config.js";
import { initAIChat} from "./aiChat.js";
var { pdfjsLib } = globalThis;
pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.mjs';

export { prepareSHLContents };

let sectionCount = 0;

// Set the mode for the default mode for data presentation
// Entries = machine readable FHIR resources, Narrative = Compostion.section.text.div
let mode = "Entries";

let shlContents;
let originalShlContents;

// Sqrl setting. See https://v7--squirrellyjs.netlify.app/docs/v7/auto-escaping
Sqrl.autoEscaping(false);

// Load header and footer on document ready and attach button actions
$(document).ready(function () {
  $('#content').show();
  $('#FhirDropdown').on('click', () => updateDisplayMode('Entries'));
  $('#NarrativeDropdown').on('click', () => updateDisplayMode('Text'));
  $('#AiChatDropdown').on('click', () => updateDisplayMode('AiChat'));
});

function loadSample() {
  $.getJSON(new URL('../samples/sample.json', import.meta.url).href, function () {
    console.log("success");
  })
    .done(function (data) {
      $('#ipsInput').val(JSON.stringify(data, null, 2));
      updateFromText();
    })
    .fail(function (e) {
      console.log("error", e);
    });
}

function updateDisplayMode(displayMode) {
  let dropdown = $('#mode');
  let newText;
  if (displayMode == 'Entries') {
    newText = 'App Interpretation';
  } else if (displayMode == 'Text') {
    newText = 'Generated Text';
  } else if (displayMode == 'AiChat') {
    newText = 'AI Chat';
  }
  if (newText) {
    mode = displayMode
    dropdown.html(newText);
  }
  shlContents.forEach((e, i) => {
    update(e, i);
  });
  if (config.show_demo) {
    $('#ipsInput').val(JSON.stringify(originalShlContents[0], null, 2));
    updateFromText();
  }

  // Show/hide content based on selected mode
  $('#rendered-ips').toggle(mode !== 'AiChat');
  $('#ai-chat-content').toggle(mode === 'AiChat');
};

// Clear data button function. Should be called on all new data loads 
function clearData() {
  // clear textbox
  $("#ipsInput").val("");
  // clear prior message
  $("#renderMessage").hide();
  // clear all viewer data and data checks table
  $('.dataDemo').empty();
}

// Update the contents from new JSON pasted in TextBox
function updateFromText() {
  var ipsTxt = $('#ipsInput').val();
  if (ipsTxt) {
    try {
      var ips = JSON.parse(ipsTxt);
      update(ips, "Demo");
    } catch (e) {
      console.log(e);
      alert("Invalid IPS - " + e);
    }
  } else {
    alert('Invalid content - Enter IPS Bundle (JSON) in "Paste Your IPS Here" box');
  }
};

// Update the data in viewer based on mode and data
function render(templateName, data, targetLocation) {
  let entryCheck = 0;
  sectionCount++;
  if (templateName === 'Patient') {
    if (!data.custodian) data.custodian = {};
    if (!data.custodian.name) data.custodian.name = '[NOT FOUND]';
    if (!data.custodian.address || !data.custodian.address[0]) {
      data.custodian.address = [{ city: '', country: '' }];
    }
    entryCheck = 1;
  } else if (data.entry) {
    entryCheck = data.entry.length
  }
  if (mode == "Entries" && templateName !== "Other") {
    return $.get(new URL(`../templates/${templateName}.html`, import.meta.url).href, function () { })
      .done(function (template) {
        console.log(data);
        var templateResult = Sqrl.Render(template, data);
        $("#" + targetLocation).html(templateResult);
      }).fail(function (e) {
        console.log("error", e);
      });
  } else {
    // if the mode was intended as Entries and narrative fallback used, display message
    if (mode === "Entries") {
      $("#renderMessage").attr("style", "display:inline");
    } else {
      $("#renderMessage").hide();
    }
    var content = { titulo: data.title, div: "No text defined.", index: sectionCount };
    if (!content.titulo) content.titulo = data.resourceType;
    if (data.text) content.div = data.text.div;
    return $.get(new URL(`../templates/Text.html`, import.meta.url).href, function () { })
      .done(function (template) {
        var templateResult = Sqrl.Render(template, content);
        $("#" + targetLocation).append(templateResult);
        $("#text-body1").removeClass('show');
      }).fail(function (e) {
        console.log("error", e);
      });
  }
};

// This is the header table for some basic data checks
function renderTable(data) {
  let jqxhr = $.get(new URL(`../templates/Checks.html`, import.meta.url).href, function () { })
    .done(function (template) {
      $("#ips-loader").hide();
      let templateResult = Sqrl.Render(template, data);
      console.log(data);
      $("#checksTable").html(templateResult);
    });
}

// For machine-readable content, use the reference in the Composition.section.entry to retrieve resource from Bundle
function getEntry(ips, fullUrl) {
  var result;
  ips.entry.forEach(function (entry) {
    if (entry.fullUrl.includes(fullUrl)) {
      console.log(`match ${fullUrl}`);
      result = entry.resource;
    } else {
    // Attempt to match based on resource and uuid
      let newMatch = fullUrl
      if (entry.resource && entry.resource.resourceType) {
        // remove the resource from reference
        newMatch = newMatch.replace(entry.resource.resourceType, '');
        // remove slash
        newMatch = newMatch.replace(/\//g, '');
        // console.log(newMatch); 
      }
      if (entry.fullUrl.includes(newMatch)) {
        console.log(`match uuid ${newMatch}`);
        result = entry.resource;
      }
    }
  });
  if (!result) {
    console.log(`missing reference ${fullUrl}`);
    result = {};
  }
  return result;
};

function loadBase64EncodedPDF(base64Data) {
  let pdfData = atob(base64Data);
  let uint8ArrayPdf = new Uint8Array(pdfData.length)
  for (let i = 0; i < pdfData.length; i++) {
    uint8ArrayPdf[i] = pdfData.charCodeAt(i)
  }
  let pdfjsframe = document.getElementById('ad-viewer');
  pdfjsframe.addEventListener('load', function(e) {
    e.currentTarget.contentWindow.PDFViewerApplication.open({data: uint8ArrayPdf});
  });
}

function prepareSHLContents(contents) {
  originalShlContents = Array.isArray(contents) ? contents : [contents];
  shlContents = JSON.parse(JSON.stringify(originalShlContents)).reverse();
  var jqxh = $.get(new URL(`../templates/IPS.html`, import.meta.url).href, function () { })
    .done(function (template) {
      shlContents.forEach((e, i) => {
        let data = { index: i };
        // Create tabs at the top if more than 1 IPS or if in demo mode
        if (shlContents.length > (config.show_demo ? 0 : 1)) {
          addTab(`IPS ${i+1}`, i);
        } else {
          data = { index: "" };
        }
        // console.log(template);
        console.log(data);
        $(Sqrl.Render(template, data))
          .appendTo('#rendered-ips');
        update(e, data.index);
      });

      if (config.show_demo) {
        addTab("IPS Demo", "Demo");
        $(Sqrl.Render(template, {index: "Demo"}))
          .appendTo('#rendered-ips');
        $('#ipsInput').val(JSON.stringify(originalShlContents[0], null, 2));
        updateFromText();
        $("#submit").on('click', updateFromText);
        $('#clearSample').on('click', clearData);
        $("#loadSample").on('click', loadSample);
      }
      $('#tabs').children().first().children().first().addClass('active show');
      $('#rendered-ips div').first().addClass('active show');
    }).fail(function (e) {
      console.log("error", e);
    });
}

function addTab(name, id) {
  $('<li></li>')
    .addClass('nav-item')
    .html(
      $('<a></a>')
        .attr('data-toggle', "tab")
        .attr('id', `tab${id}`)
        .attr('href', `#ips${id}`)
        .addClass('nav-link')
        .text(name)
    )
    .appendTo('#tabs');
}

// Primary function to traverse the Bundle and get data
// Calls the render function to display contents 
function update(ips, index) {
  initAIChat(ips);
  sectionCount = 0;
  $(`.output${index}`).html("");
  $("#renderMessage").hide();
  ips.entry.forEach(function (entry) {
    if (!entry.resource) console.log(entry);
    if (entry.resource.resourceType == "Composition") {
      var composition = entry.resource;
      let patient = {};
      if (composition.custodian && composition.custodian.reference) {
        console.log(composition.custodian.reference);
        composition.custodian = getEntry(ips, composition.custodian.reference);
      } else {
        console.log('no custodian reference');
        composition.custodian = {};
      }
      if (composition.subject && composition.subject.reference) {
        console.log(composition.subject.reference);
        patient = getEntry(ips, composition.subject.reference);
      } else {
        console.log('no subject reference');
      }
      render("Composition", composition, `Composition${index}`);
      console.log('Patient Card');
      if (patient) {
        console.log(patient)
        render("Patient", patient, `Patient${index}`);
      }
      if (index !== "Demo") {
        let tabName = "";
        if (composition.date) {
          tabName = `Summary (${composition.date.split('T')[0]})`;
        }
        if (patient && patient.name) {
          if (Array.isArray(patient.name) && patient.name.length > 0) {
            if (Array.isArray(patient.name[0].given) && patient.name[0].given[0]) {
              tabName = `${patient.name[0].given[0]}'s ${tabName}`;
            }
          }
        }
        if (tabName) {
          $(`#tab${index}`).text(tabName);
        }
      }
      let alertMissingComposition = false;
      composition.section.forEach(function (section) {
        if (!section.entry) {
          return; // Don't display empty sections
        } else if (!section || !section.code || !section.code.coding || !section.code.coding[0]) {
          alertMissingComposition = true;
          console.log('Section is missing coding information');
        } else if (section.code.coding[0].code == "11450-4") {
          console.log('Problems Section');
          section.problems = [];
          section.entry?.forEach(function (problem) {
            console.log(problem.reference)
            section.problems.push(getEntry(ips, problem.reference));
          });
          render("Problems", section, `Problems${index}`);
        } else if (section.code.coding[0].code == "48765-2") {
          console.log('Allergies Section');
          section.allergies = [];
          section.entry?.forEach(function (allergy) {
            console.log(allergy.reference)
            let allergy2 = getEntry(ips, allergy.reference);
            if (!allergy2.category) allergy2.category = [' '];
            if (!allergy2.type) allergy2.type = ' ';
            section.allergies.push(allergy2);
          });
          render("Allergies", section, `Allergies${index}`);
        } else if (section.code.coding[0].code == "10160-0") {
          console.log('Medications Section');
          section.medications = [];
          section.entry?.forEach(function (medication) {
            console.log(medication.reference);
            // while variable name is "statement", these references may be either MedicationStatement or MedicationRequest resources
            let statement = getEntry(ips, medication.reference);
            let medicationReference;
            // Either MedicationRequest or MedicationStatement may have a reference to Medication 
            if (statement.medicationReference && statement.medicationReference.reference) {
              medicationReference = getEntry(ips, statement.medicationReference.reference);

            } else if (statement.medicationCodeableConcept) {
                medicationReference = { code: statement.medicationCodeableConcept };
            } else {
                medicationReference = {code: { coding: [ { system: '', display: '', code: '' } ] } };
            }
            // MedicationStatement has dosage while MedicationRequest has dosageInstruction. Use alias to simplify template
            if (statement.dosageInstruction) statement.dosage = statement.dosageInstruction;
            section.medications.push({
              statement: statement,
              medication: medicationReference
            });
          });
          render("Medications", section, `Medications${index}`);
        } else if (section.code.coding[0].code == "11369-6") {
          console.log('Immunizations Section');
          section.immunizations = [];
          section.entry?.forEach(function (immunization) {
            console.log(immunization.reference);
            section.immunizations.push(getEntry(ips, immunization.reference));
          });
          section.immunizations.sort((a, b) => {
            let fa = a.occurrenceDateTime,
                fb = b.occurrenceDateTime;
            if (fa < fb) {
                return -1;
            }
            if (fa > fb) {
                return 1;
            }
            return 0;
          });
          render("Immunizations", section, `Immunizations${index}`);
        } else if (section.code.coding[0].code == "30954-2") {
          console.log('Observations Section');
          section.observations = [];
          section.entry?.forEach(function (observation) {
            console.log(observation.reference);
            section.observations.push(getEntry(ips, observation.reference));
          });
          render("Observations", section, `Observations${index}`);
        } else if (section.code.coding[0].code == "42348-3") {
          console.log('Advance Directives Section');
          section.ad = {
            "consent": [],
            "documentReference": [],
            "other": []
          };
          section.entry?.forEach(function (ad) {
            console.log(ad.reference);
            entry = getEntry(ips, ad.reference);
            if (entry.resourceType == "Consent") {
              section.ad.consent.push(entry);
            } else if (entry.resourceType == "DocumentReference") {
              section.ad.documentReference.push(entry);
            } else {
              section.ad.other.push(entry);
            }
          });
          render("AdvanceDirectives", section, `AdvanceDirectives${index}`).then(function(res) {
            if (section.ad.documentReference.length) {
              section.ad.documentReference[0].content.forEach(element => {
                if (element.attachment.contentType === "application/pdf") {
                  if (element.attachment.data) {
                    loadBase64EncodedPDF(element.attachment.data);
                  }
                }
              });
            }
          });
        } else if (section.code.coding[0].code == "29762-2") {
          console.log('Social History Section');
          section.odh = {
            "all": [],
            "status": [],
            "retirement": [],
            "combat": [],
            "usual": [],
            "history": []
          };
          section.entry?.forEach(function (entry) {
            console.log(entry.reference);
            section.odh.all.push(getEntry(ips, entry.reference));
          });
          section.odh.all?.forEach(function (resource) {
            switch (resource?.code?.coding?.[0]?.code) {
              case "74165-2": // Employment Status
                section.odh.status.push(resource);
                break;
              case "87510-4": // Retirement Date
                section.odh.retirement.push(resource);
                break;
              case "87511-2": // Combat Zone Period
                section.odh.combat.push(resource);
                break;
              case "21843-8": // Usual Work
                section.odh.usual.push(resource);
                break;
              case "11341-5": // Past Or Present Job
                section.odh.history.push(resource);
                break;
              default:
                break;
            }
          })
          render("SocialHistory", section, `SocialHistory${index}`);
        } else {
          render("Other", section, `Other${index}`);
          console.log(`Section with code: ${section.code.coding[0].code} not rendered since no template`);
        }
      });
      if (alertMissingComposition) alert('Missing coding information in Composition resource. Rendering may be incomplete.')
    }
  });
  //don't need to do anything if the header is not shown
  if ($('#ipsInput')) {
    checks(ips)
  }
};

// Updates the header data for simple data checks. Note that this is NOT full FHIR validation 
function checks(ips) {
  let composition = ips.entry[0];
  let data = { 
    data: [],
    errors: [] 
  };
  if (composition.resource.resourceType === "Composition" && composition.resource.section) {
    let sections = {
      allergies: false,
      medications: false,
      problems: false
    };
    for (let i = 0; i < composition.resource.section.length; i++) {
      let section = composition.resource.section[i]
      let newData = {};
      newData.display = section.title;
      if (section.code.coding[0].code == "48765-2") sections.allergies = true;
      if (section.code.coding[0].code == "10160-0") sections.medications = true;
      if (section.code.coding[0].code == "11450-4") sections.problems = true;
      if (section.entry) {
        newData.entries =   section.entry.length;
        newData.entriesColor = "green";
      } else {
        newData.entries = 0;
        newData.entriesColor = "red";
      }
      if (section.text && section.text.div) {
        newData.narrative = "✓"
        newData.narrativeColor = "green";
      } else {
        newData.narrative = "✗"
        newData.narrativeColor = "red";
      }
      data.data.push(newData);
    }
    if (!sections.allergies) data.errors.push("Missing required allergies section");
    if (!sections.medications) data.errors.push("Missing required medications section");
    if (!sections.problems) data.errors.push("Missing required problems section");
  }
  renderTable(data);
}
