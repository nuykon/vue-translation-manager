<template>
  <div>
    <h1>Привет мир</h1>
    <ul>
      <li v-for="user in users" :key="user.id">
        <b>Иван дурак</b> {{user.name}}<br>
        <b>Алые паруса</b> {{user.birthday}}<br>
        <b>Вышел заяц на крыльцо почесать свое яйцо</b><br>
      </li>
    </ul>
  </div>
</template>

<script>
export default {}
</script>
