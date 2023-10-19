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
      <a href="#" data-toggle="collapse" data-target="#observations-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Observations (Results)</b></span>
    </header>
    <div class="card-body collapse show" id="observations-body">
      <table class="table table-bordered table-sm">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Date</th>
            <th scope="col">Value</th>
            <th scope="col">Category</th>
          </tr>
        </thead>
        {#each options.observations as item, index}
          <tr>
            <td>
              {#if item.code && item.code.coding}
                {item.code.coding[0].display}
                ({item.code.coding[0].code})
              {/if}
              {#if item.code && item.code.text}
                [Uncoded text shown]: {item.code.text}
              {/if}
            </td>
            <td>
              {#if item.effectiveDateTime}
                {item.effectiveDateTime}
              {/if}
            </td>
            <td>
              {#if item.valueCodeableConcept}
                {item.valueCodeableConcept.coding[0].display}
              {/if}
              {#if item.valueQuantity}
                {item.valueQuantity.value} {item.valueQuantity.unit}
              {/if}
              {#if item.valueString}
                {item.valueString}
              {/if}
            </td>
            {#if item.category && item.category[0] && item.category[0].coding && item.category[0].coding[0]}
              <td>{item.category[0].coding[0].code}</td>
            {/if}
          </tr>
        {/each}
      </table>
    </div>
  </div>
  