<script>
    export let name; // Define a prop for the name array
    export let birthDate; // Define a prop for the birthDate
  </script>
  
  <style>
    /* Define your CSS styles here */
    .card {
      /* Your card styles */
    }
  </style>
  
  <div class="card">
    <header class="card-header">
      <a href="#" data-toggle="collapse" data-target="#patient-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Patient</b></span>
    </header>
    <div class="card-body collapse show" id="patient-body">
      <p class="card-text">
        Name: {name[0].given}, {name[0].family}
        <br>
        Birth Date: {birthDate}
      </p>
    </div>
  </div>
  