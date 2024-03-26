import config from "./config.js";

export { prepareSHLContents };

let sectionCount = 0;

// Set the mode for the default mode for data presentation
// Entries = machine readable FHIR resources, Narrative = Compostion.section.text.div
let mode = "Entries";

let shlContents;

// Sqrl setting. See https://v7--squirrellyjs.netlify.app/docs/v7/auto-escaping
Sqrl.autoEscaping(false);

// Load header and footer on document ready and attach button actions
$(document).ready(function () {
  $('#content').show();
  $('#FhirDropdown').on('click', () => updateDisplayMode('Entries'));
  $('#NarrativeDropdown').on('click', () => updateDisplayMode('Text'));
});

function loadSample() {
  $.getJSON(new URL('../samples/sample.json', import.meta.url).href, function () {
    console.log("success");
  })
    .done(function (data) {
      $('#ipsInput').val(JSON.stringify(data));
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
  }
  if (newText) {
    mode = displayMode
    dropdown.html(newText);
  }
  shlContents.forEach((e, i) => {
    update(e, (shlContents.length === 1 ? "" : i));
  });
  if (config.show_demo) {
    updateFromText();
  }
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
  let pdfjsframe = $('#ad-pdf-viewer');
  pdfjsframe.addEventListener('load', function(e) {
    e.currentTarget.contentWindow.PDFViewerApplication.open({data: uint8ArrayPdf});
  });
}

function loadBase64EncodedHTML(base64Data) {
  let htmlData = atob(base64Data);
  let htmlDiv = $('.ad-html-viewer');
  htmlDiv.html(htmlData);
}

function prepareSHLContents(contents) {
  if (!Array.isArray(contents)){
    contents = [contents];
  }
  shlContents = contents.reverse();
  var jqxhr = $.get(new URL(`../templates/IPS.html`, import.meta.url).href, function () { })
    .done(function (template) {
      shlContents.forEach((e, i) => {
        let data = { index: i };
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
        loadSample();
        $("#submit").on('click', updateFromText);
        $('#clearSample').on('click', clearData);
        $("#loadSample").on('click', loadSample);
      }
      // $('#tabs').children().first().children().first().addClass('active show');
      // $('#rendered-ips div').first().addClass('active show');
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
      if (index !== "Demo" && composition.date) {
        $(`#tab${index}`).text(`IPS ${composition.date.split('T')[0]}`);
      }
      // render("Composition", composition, `Composition${index}`);
      console.log('Patient Card');
      if (patient) {
        console.log(patient)
        // render("Patient", patient, `Patient${index}`);
      }
      let alertMissingComposition = false;
      composition.section.forEach(function (section) {
        if (section.code.coding[0].code == "42348-3") {
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
                } else if (element.attachment.contentType === "text/html") {
                  if (element.attachment.data) {
                    loadBase64EncodedHTML(element.attachment.data);
                  }
                }
              });
            }
          });
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
