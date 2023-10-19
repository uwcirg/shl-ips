<script>
    export let options; // Define a prop to pass the data to the component
  </script>
  
  <style>
    /* Define your CSS styles here */
    .card {
      /* Your card styles */
    }
  </style>
  
  <div class="card">
    <header class="card-header">
      <a href="#" data-toggle="collapse" data-target="#medications-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Current Medications</b></span>
    </header>
    <div class="card-body collapse show" id="medications-body">
      <ul class="list-group">
        {#each options.medications as item, index}
          <li class="list-group-item">
            <!-- {item.statement.resourceType}  -->
            <!-- <br /> -->
            {#if item.medication.code && item.medication.code.coding && item.medication.code.coding.length}
              {#each item.medication.code.coding as code}
                <span class="badge badge-primary">{code.system}</span>
                <br>
                {code.display}
                {#if code.code}
                  ({code.code})
                {/if}
                <br>
              {/each}
            {:else}
              <span class="badge badge-secondary">uncoded</span>
              <br>
              {#if item.medication.code && item.medication.code.text}
                {item.medication.code.text}
              {:else}
                {item.statement.medicationReference.display}
              {/if}
              <br>
            {/if}
            {#if item.medication.ingredient && item.medication.ingredient.itemCodeableConcept}
              {#each item.medication.ingredient as ingredient}
                <table class="table table-bordered table-sm">
                  <thead>
                    <tr><th colspan="5">Composition</th></tr>
                    <tr>
                      <th scope="col">Ingredient</th>
                      <th scope="col">Strength Numerator Qty</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Strength Denominator Qty</th>
                      <th scope="col">Strength Denominator Unit</th>
                    </tr>
                  </thead>
                  <tr>
                    <td>{ingredient.itemCodeableConcept.coding[0].display}</td>
                    <td>{ingredient.strength.numerator.value}</td>
                    <td>{ingredient.strength.numerator.unit}</td>
                    <td>{ingredient.strength.denominator.value}</td>
                    <td>{ingredient.strength.denominator.unit}</td>
                  </tr>
                </table>
              {/each}
            {/if}
            {#if item.statement.dosage && item.statement.dosage[0].route && item.statement.dosage[0].route.coding && item.statement.dosage[0].doseAndRate}
              <table class="table table-bordered table-sm">
                <thead>
                  <tr><th colspan="5">Dosage</th></tr>
                  <tr>
                    <th scope="col">Route</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Freq. Qty</th>
                    <th scope="col">Freq. Period</th>
                  </tr>
                </thead>
                <tr>
                  <td>{item.statement.dosage[0].route.coding[0].display}</td>
                  <td>{item.statement.dosage[0].doseAndRate[0].doseQuantity.value}</td>
                  <td>{item.statement.dosage[0].doseAndRate[0].doseQuantity.unit}</td>
                  {#if item.statement.dosage[0].timing && item.statement.dosage[0].timing.repeat}
                    <td>{item.statement.dosage[0].timing.repeat.count}</td>
                    <td>{item.statement.dosage[0].timing.repeat.periodUnit}</td>
                  {/if}
                </tr>
              </table>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
  