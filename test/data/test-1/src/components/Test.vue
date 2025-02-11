<template>
  <div>
    <h1>Привет мир!</h1>
    <h1>Русский + English</h1>
    <h1>Hello Kitty</h1>
    <ul>
      <li v-for="user in users" :key="user.id">
        <b>Иван дурак</b> {{user.name}}<br>
        <b>Алые паруса</b> {{user.birthday}}<br>
        <b>Демонстратор сверхзвукового лайнера XB-1 завершил программу летных испытаний</b><br>
      </li>
    </ul>
  </div>
</template>

<script>
export default {}
</script>
