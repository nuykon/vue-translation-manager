<template>
  <div>
    <h1>Привет мир!</h1>
    <h1>Русский + English</h1>
    <h1>Hello / Kitty</h1>
    <h1>Hello \ Mary</h1>
    <h1>Hello - Вася</h1>
    <h1>Прощай _ Антип</h1>
    <h1>Странная % строка</h1>
    <h1>Странная & строка 2</h1>
    <h1>Странная = строка 3</h1>
    <h1>Странная . строка 4</h1>
    <h1>Странная @ строка 5</h1>
    <h1>Странная # строка 6</h1>
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
