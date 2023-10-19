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
      <a href="#" data-toggle="collapse" data-target="#immunizations-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Immunizations</b></span>
    </header>
    <div class="card-body collapse show" id="immunizations-body">
      <ul class="list-group">
        {#each options.immunizations as item}
          <li class="list-group-item">
            <span><b>{item.occurrenceDateTime}</b></span><br />
            <span>
              {#if item.vaccineCode.coding[0].display}
                {item.vaccineCode.coding[0].display}
              {:else}
                {item.vaccineCode.text}
              {/if}
            </span>
            <br>
            <span class="badge badge-primary">{item.vaccineCode.coding[0].system}</span>
            {item.vaccineCode.coding[0].code}
            <br>
          </li>
        {/each}
      </ul>
    </div>
  </div>
  