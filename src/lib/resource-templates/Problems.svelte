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
      <a href="#" data-toggle="collapse" data-target="#problems-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Problems / Diagnoses</b></span>
    </header>
    <div class="card-body collapse show" id="problems-body">
      <ul class="list-group">
        {#each options.problems as item, index}
          <li class="list-group-item">
            {#if item.onsetDateTime}
              <!-- Insert content here if onsetDateTime exists -->
            {/if}
            {#if item.code && item.code.coding && item.code.coding[0]}
              <span class="badge badge-primary">{item.code.coding[0].system}</span>
              <br>
              {item.code.coding[0].display} ({item.code.coding[0].code})
            {/if}
            {#if item.code && item.code.text}
              [Uncoded text shown]: {item.code.text}
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
  