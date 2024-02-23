<script>
    import {
      Card,
      CardBody,
      CardText
    } from "sveltestrap";

    export let resource;
  </script>

  <Card>
    <CardBody>
      <CardText>
        Name: {resource.name[0].given}, {resource.name[0].family}
        <br>
        Birth Date: {resource.birthDate}
      </CardText>
    </CardBody>
  </Card>
  