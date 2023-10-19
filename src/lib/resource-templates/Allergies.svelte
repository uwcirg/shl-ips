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
      <a href="#" data-toggle="collapse" data-target="#Allergies-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Allergies and Intolerancies</b></span>
    </header>
    <div class="card-body collapse show" id="Allergies-body">
      <ul class="list-group">
        {#each options.allergies as item}
          <li class="list-group-item">
            {#if item.criticality}
              {#if item.criticality === "high"}
                <span class="badge badge-danger">
              {:else}
                <span class="badge badge-primary">
              {/if}
            {:else}
              <span class="badge badge-secondary">
            {/if}
            {item.type} - {item.category[0]} - Criticality: {item.criticality}
            </span>
            {#if item.code && item.code.coding}
              <br>
              {item.code.coding[0].display} ({item.code.coding[0].code})
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
  