<!-- frontend/src/components/erp.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// 若前後端同網域部署，用空字串；不同網域就填完整網址
const API = '' // 例如 'https://your-backend.onrender.com'

// 分頁
const currentPage = ref('one')     // one: 入庫, two: 庫存(+品項設定), three: 出庫, four: 報表
const currentPage2 = ref('one-1')  // 入庫子頁
const currentPage3 = ref('one-1')  // 出庫子頁
const currentPage4 = ref('one-1')  // 報表子頁
const currentPageStock = ref('one-1') // 庫存子頁：one-1=庫存總覽, two-2=品項設定

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)

// 清單
const recordList = ref([])   // 入庫
const recordList2 = ref([])  // 出庫（此專案中會以「原料」名義扣出）
const isLoading = ref(false)

// 品項（動態從 DB）
// 原料：{ _id, name, salePrice, type:'raw' }
// 成品：{ _id, name, salePrice, type:'product', bindRaw:'原料名稱', ratio: 每份原料用量(數字) }
const items = ref([])
const rawItems = computed(() => items.value.filter(i => i.type === 'raw'))
const productItems = computed(() => items.value.filter(i => i.type === 'product'))

// 入庫僅能選原料；出庫僅能選成品
const inOptions  = computed(() => rawItems.value.map(i => i.name))
const outOptions = computed(() => productItems.value.map(i => i.name))

// 群組：一個原料底下掛它的成品
const groups = computed(() =>
  rawItems.value.map(r => ({
    raw: r,
    products: productItems.value.filter(p => p.bindRaw === r.name)
  }))
)

// 單筆輸入
const inRow  = ref({ item: '', quantity: '', price: '', note: '' })
const outRow = ref({ item: '', quantity: '', note: '' }) // item=成品名稱；會轉扣原料

const editingId = ref(null)
const selectedItem  = ref('') // 入庫查詢用（原料）
const selectedItem2 = ref('') // 出庫查詢用（以原料為主，因為實際扣的是原料）

// === 入/出庫共用 ===
const isEmpty = (v) => v === '' || v === null || v === undefined
const isRowCompleteIn = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  !isEmpty(row.price) && Number(row.price) >= 0
const isRowCompleteOut = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0

function clearIn () { inRow.value = { item: '', quantity: '', price: '', note: '' } }
function clearOut () { outRow.value = { item: '', quantity: '', note: '' } }

// === 讀取品項 ===
async function fetchItems () {
  const { data } = await axios.get(`${API}/items`)
  items.value = data || []
}

// === 入庫/出庫資料讀取 ===
const fetchRecords = async () => {
  try {
    let url = `${API}/records`
    const q = []
    if (selectedDate2.value) q.push('date=' + selectedDate2.value)
    if (selectedItem.value)  q.push('item=' + encodeURIComponent(selectedItem.value))
    if (q.length) url += '?' + q.join('&')
    const { data } = await axios.get(url)
    recordList.value = data
  } catch (err) {
    alert('❌ 無法取得入庫資料：' + err.message)
  }
}
const fetchRecords2 = async () => {
  try {
    let url = `${API}/outrecords`
    const q = []
    if (selectedDate4.value) q.push('date=' + selectedDate4.value)
    if (selectedItem2.value) q.push('item=' + encodeURIComponent(selectedItem2.value)) // 以原料名查
    if (q.length) url += '?' + q.join('&')
    const { data } = await axios.get(url)
    recordList2.value = data
  } catch (err) {
    alert('❌ 無法取得出庫資料：' + err.message)
  }
}
const fetchRecords3 = async () => {
  try {
    isLoading.value = true
    const [inRes, outRes] = await Promise.all([
      axios.get(`${API}/records`),
      axios.get(`${API}/outrecords`)
    ])
    recordList.value = inRes.data
    recordList2.value = outRes.data
  } catch (err) {
    alert('❌ 取得庫存資料失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// === 平均成本(以整筆金額加權) & 庫存彙總（僅原料） ===
const itemSummary = computed(() => {
  const names = inOptions.value
  const summary = []
  for (const item of names) {
    const inRecords  = recordList.value.filter(r => r.item === item)
    const outRecords = recordList2.value.filter(r => r.item === item) // 出庫用原料名扣

    const inQty      = inRecords.reduce((s, r) => s + Number(r.quantity), 0)
    const inSumPrice = inRecords.reduce((s, r) => s + Number(r.price), 0)
    const outQty     = outRecords.reduce((s, r) => s + Number(r.quantity), 0)
    const outSum     = outRecords.reduce((s, r) => s + Number(r.price), 0)

    const stockQty        = inQty - outQty
    const stockTotalPrice = inSumPrice - outSum
    const avgPrice        = stockQty > 0 ? stockTotalPrice / stockQty : 0

    summary.push({ item, quantity: stockQty, avgPrice, totalPrice: stockTotalPrice })
  }
  return summary
})
const getAvgPrice = (rawName) => {
  const f = itemSummary.value.find(i => i.item === rawName)
  return f ? f.avgPrice : 0
}

// 取得成品的綁定資訊
function findProduct(name) { return productItems.value.find(p => p.name === name) || null }
function getBinding(productName) {
  const p = findProduct(productName)
  if (!p || !p.bindRaw || !p.ratio) return null
  return { rawName: p.bindRaw, ratio: Number(p.ratio) }
}
const selectedBinding = computed(() => getBinding(outRow.value.item))

// === 出庫時檢查庫存是否足夠（檢查綁定的原料） ===
function checkOutStock () {
  const row = outRow.value
  if (!row.item || !row.quantity) return true
  const bind = getBinding(row.item)
  if (!bind) {
    alert('❌ 此成品尚未綁定原料與用量，請先到「品項設定」綁定')
    return false
  }
  const rawName = bind.rawName
  const needQty = Number(row.quantity) * Number(bind.ratio)

  const inQty = recordList.value
    .filter(r => r.item === rawName)
    .reduce((s, r) => s + Number(r.quantity), 0)
  const outQty = recordList2.value
    .filter(r => r.item === rawName)
    .reduce((s, r) => s + Number(r.quantity), 0)

  const left = inQty - outQty
  if (needQty > left + 1e-9) {
    alert(`❌【${rawName}】庫存不足，需要 ${needQty.toFixed(2)}，目前僅剩 ${left.toFixed(2)}`)
    return false
  }
  return true
}

// === 送出入庫（價格為整筆） ===
const submitIn = async () => {
  const row = inRow.value
  if (!selectedDate.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteIn(row)) { alert('❌ 入庫：品項/數量/價格需填寫（數量>0，價格可為0）'); return }

  try {
    const payload = {
      item: row.item,
      quantity: Number(row.quantity),
      price: Number(Number(row.price).toFixed(2)), // 整筆金額
      note: row.note || '',
      date: selectedDate.value
    }
    await axios.post(`${API}/records`, payload)
    alert('✅ 入庫成功')
    await fetchRecords3()
    clearIn()
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// === 送出出庫（選成品；實際扣原料與成本） ===
const submitOut = async () => {
  const row = outRow.value
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteOut(row)) { alert('❌ 出庫：品項/數量需填（數量>0）'); return }
  const bind = getBinding(row.item)
  if (!bind) { alert('❌ 此成品尚未綁定原料與用量，請先到「品項設定」綁定'); return }
  if (!checkOutStock()) return

  try {
    const qtyProduct = Number(row.quantity)
    const rawName    = bind.rawName
    const rawQty     = Number((qtyProduct * Number(bind.ratio)).toFixed(2))
    const unitRaw    = Number(getAvgPrice(rawName))
    const lineTotal  = Number((unitRaw * rawQty).toFixed(2)) // 以原料平均單價估算成本

    const payload = {
      item: rawName,                 // 以原料扣庫
      quantity: rawQty,              // 原料扣量
      price: lineTotal,              // 整筆金額 = 原料平均單價 × 原料扣量
      note: (row.note || '') + `（由成品「${row.item}」x ${qtyProduct} 轉扣）`,
      date: selectedDate3.value
    }
    await axios.post(`${API}/outrecords`, payload)
    alert('✅ 出庫成功（已從原料扣庫）')
    await fetchRecords3()
    clearOut()
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// === 入/出庫列表編修 ===
const startEditRecord  = (id) => { editingId.value = id }
const startEditRecord2 = (id) => { editingId.value = id }

const confirmEdit = async () => {
  const rec = recordList.value.find(r => r._id === editingId.value)
  try {
    await axios.put(`${API}/records/${editingId.value}`, rec)
    editingId.value = null
    await fetchRecords()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const confirmEdit2 = async () => {
  const rec = recordList2.value.find(r => r._id === editingId.value)
  try {
    await axios.put(`${API}/outrecords/${editingId.value}`, rec)
    editingId.value = null
    await fetchRecords2()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const deleteRecord = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(`${API}/records/${id}`); await fetchRecords() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}
const deleteRecord2 = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(`${API}/outrecords/${id}`); await fetchRecords2() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}

// === 品項管理（群組：原料 + 綁定成品） ===
const itemEditingId = ref(null)
const newRaw = ref({ name: '', salePrice: '' })

// 每個原料群組底下新增成品的暫存表
const newProductMap = ref({}) // { [rawName]: { name:'', salePrice:'', ratio:'' } }
function np(rawName) {
  if (!newProductMap.value[rawName]) newProductMap.value[rawName] = { name:'', salePrice:'', ratio:'' }
  return newProductMap.value[rawName]
}

const addRawItem = async () => {
  if (!newRaw.value.name) { alert('請輸入原料名稱'); return }
  try {
    await axios.post(`${API}/items`, {
      name: newRaw.value.name.trim(),
      salePrice: Number(newRaw.value.salePrice || 0),
      type: 'raw'
    })
    newRaw.value = { name: '', salePrice: '' }
    await fetchItems()
  } catch (e) {
    alert('新增失敗：' + e.message)
  }
}
const addProductUnder = async (rawName) => {
  const form = np(rawName)
  if (!form.name) { alert('請輸入成品名稱'); return }
  if (!form.ratio || Number(form.ratio) <= 0) { alert('請輸入每份原料用量（>0）'); return }
  try {
    await axios.post(`${API}/items`, {
      name: form.name.trim(),
      salePrice: Number(form.salePrice || 0),
      type: 'product',
      bindRaw: rawName,
      ratio: Number(form.ratio)
    })
    newProductMap.value[rawName] = { name:'', salePrice:'', ratio:'' }
    await fetchItems()
  } catch (e) {
    alert('新增失敗：' + e.message)
  }
}
const startEditItem = (id) => { itemEditingId.value = id }
const confirmEditItem = async (it) => {
  try {
    // 原料：name/salePrice；成品：name/salePrice/bindRaw/ratio
    const body = {
      name: it.name,
      salePrice: Number(it.salePrice || 0)
    }
    if (it.type === 'product') {
      body.bindRaw = it.bindRaw || ''
      body.ratio   = Number(it.ratio || 0)
    }
    await axios.put(`${API}/items/${it._id}`, body)
    itemEditingId.value = null
    await fetchItems()
  } catch (e) {
    alert('更新失敗：' + e.message)
  }
}
const deleteItem = async (id) => {
  if (!confirm('確定刪除該品項？')) return
  try {
    await axios.delete(`${API}/items/${id}`)
    await fetchItems()
  } catch (e) {
    alert('刪除失敗：' + e.message)
  }
}

// === 報表（只顯示成品；成本用「綁定原料平均單價 × ratio × 份數」動態算） ===
const fixedExpense = ref('')
const extraExpense = ref('')
const reportQty = ref({}) // { [productName]: qty }

watch(items, () => {
  const map = { ...reportQty.value }
  for (const it of productItems.value) if (!(it.name in map)) map[it.name] = 0
  for (const k of Object.keys(map)) if (!productItems.value.find(i => i.name === k)) delete map[k]
  reportQty.value = map
}, { deep: true })

function costOfProduct(product) {
  const bind = getBinding(product.name)
  if (!bind) return 0
  const qty = Number(reportQty.value[product.name] || 0)
  const avgRaw = getAvgPrice(bind.rawName)
  return Number((qty * bind.ratio * avgRaw).toFixed(2))
}

const revenueTotal = computed(() => {
  let sum = 0
  for (const it of productItems.value) {
    const q = Number(reportQty.value[it.name] || 0)
    sum += q * Number(it.salePrice || 0)
  }
  return sum
})
const costTotal = computed(() =>
  productItems.value.reduce((s, it) => s + costOfProduct(it), 0)
)
const netProfit = computed(() =>
  revenueTotal.value - costTotal.value - Number(fixedExpense.value || 0) - Number(extraExpense.value || 0)
)
const totalProductQty = computed(() =>
  productItems.value.reduce((s, it) => s + Number(reportQty.value[it.name] || 0), 0)
)

// 送出報表（規則：成本=0 ⇒ 份數總計必須 > 0）
const submitReport = async () => {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }
  if (Number(costTotal.value || 0) === 0 && Number(totalProductQty.value || 0) <= 0) {
    alert('❌ 銷貨成本為 0，份數必須大於 0 才能送出')
    return
  }
  const payload = {
    date: selectedDate5.value,
    items: productItems.value.map(it => ({ item: it.name, qty: Number(reportQty.value[it.name] || 0) })),
    fixedExpense: Number(fixedExpense.value || 0),
    extraExpense: Number(extraExpense.value || 0),
    netProfit: Number(netProfit.value || 0)
  }
  try {
    await axios.post(`${API}/reports`, payload)
    alert('✅ 報表已送出')
  } catch (err) {
    alert('❌ 報表傳送失敗：' + err.message)
  }
}

// 報表總攬
const reportList = ref([])
const isReportsLoading = ref(false)
async function fetchReportsList () {
  try {
    isReportsLoading.value = true
    const { data } = await axios.get(`${API}/reports`)
    reportList.value = (data || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  } finally {
    isReportsLoading.value = false
  }
}
const deleteReportByDate = async (dateStr) => {
  if (!dateStr) return
  if (!confirm(`❌ 確定要清除 ${dateStr} 的報表資料嗎？`)) return
  try {
    await axios.delete(`${API}/reports/${encodeURIComponent(dateStr)}`)
    alert('✅ 已清除該日報表資料')
    await fetchReportsList()
  } catch (e) {
    alert('❌ 清除失敗：' + (e?.message || ''))
  }
}

// === 掛載/監聽 ===
onMounted(async () => {
  await fetchItems()
  if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
  else if (currentPage.value === 'four') { await fetchReportsList() }
  else { await fetchRecords() }
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedItem, selectedItem2, currentPage, currentPageStock],
  async () => {
    if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
    else if (currentPage.value === 'four') {
      // 報表頁改為純前端即時計算，因此不需要再打 /outrecords/total
    } else {
      await fetchRecords()
    }
  },
  { immediate: false }
)

watch(currentPage4, async (p) => {
  if (currentPage.value === 'four' && p === 'two-2') await fetchReportsList()
})
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }"   @click="() => { currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }"   @click="() => { currentPage = 'two'; currentPageStock = 'one-1' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="() => { currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }"  @click="() => { currentPage = 'four' ; currentPage4 = 'one-1'; fetchReportsList() }">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫 -->
    <div v-if="currentPage === 'one'">
      <div v-if="currentPage2 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'two-2' }" @click="() => { currentPage2 = 'two-2'; fetchRecords() }">入庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">商品入庫</h5>
          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>品項</th><th>數量(g)</th><th>整筆價格</th><th>備註</th></tr></thead>
            <tbody>
              <tr>
                <td><div class="clear" @click="clearIn" type="button">空</div></td>
                <td class="items">
                  <select v-model="inRow.item">
                    <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty"   v-model.number="inRow.quantity" min="0.01" step="0.01" /></td>
                <td><input type="number" class="price" v-model.number="inRow.price"    min="0"    step="0.01" /></td>
                <td><input class="note" v-model="inRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end">
            <button class="btn text-center ms-2" @click="submitIn">送出</button>
          </div>
        </div>
      </div>

      <div v-else-if="currentPage2 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'one-1' }" @click="currentPage2 = 'one-1'">新增入庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">入庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate2" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3 mb-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">品項&ensp;:</div>
              <select v-model="selectedItem" style="min-height:42px;font-size:14px;flex:1;">
                <option value=""></option>
                <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>品項</th><th>數量</th><th>整筆價格</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
            <tbody>
              <tr v-for="record in recordList" :key="record._id">
                <td class="button">
                  <template v-if="editingId === record._id">
                    <button class="delete-btn" @click="deleteRecord(record._id)">刪</button>
                  </template>
                  <template v-else>
                    <button class="update-btn" @click="startEditRecord(record._id)">改</button>
                  </template>
                </td>

                <td class="items">
                  <template v-if="editingId === record._id">
                    <select v-model="record.item">
                      <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.quantity" min="0.01" step="0.01" /></template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="price">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.price" min="0" step="0.01" /></template>
                  <template v-else>{{ Number(record.price).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id"><input v-model="record.note" /></template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <template v-if="editingId === record._id">
                      <button class="update-btn" style="padding:6px 10px;" @click="confirmEdit">確認</button>
                    </template>
                    <template v-else>{{ record.date }}</template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>

    <!-- 庫存 -->
    <div v-else-if="currentPage === 'two'">
      <!-- 庫存：單顆切換按鈕（與其他頁一致） -->
      <div class="d-flex justify-content-center align-items-center">
        <button
          v-if="currentPageStock === 'one-1'"
          style="min-width: 330px;"
          class="btn mb-3"
          :class="{ active: currentPageStock === 'two-2' }"
          @click="() => { currentPageStock = 'two-2'; fetchItems() }"
        >
          品項設定
        </button>
        <button
          v-else
          style="min-width: 330px;"
          class="btn mb-3"
          :class="{ active: currentPageStock === 'one-1' }"
          @click="() => { currentPageStock = 'one-1'; fetchRecords3() }"
        >
          庫存總覽
        </button>
      </div>

      <!-- 庫存總覽（僅原料） -->
      <div v-if="currentPageStock === 'one-1'" class="form-wrapper">
        <h5 class="title">庫存總覽</h5>
        <div v-if="isLoading" style="font-size:14px;color:#888;">載入中...</div>
        <div v-else>
          <div v-if="itemSummary.length > 0" style="font-size:14px;">
            <table class="table">
              <thead><tr><th>品項</th><th>數量(g)</th><th>平均單價</th><th>總價</th></tr></thead>
              <tbody>
                <tr v-for="(r, idx) in itemSummary" :key="idx">
                  <td>{{ r.item }}</td>
                  <td>{{ Number(r.quantity).toFixed(2) }}</td>
                  <td>{{ Number(r.avgPrice).toFixed(2) }}</td>
                  <td>{{ Number(r.totalPrice).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="font-size:14px;color:#888;">目前無資料</div>
        </div>
      </div>

      <!-- 品項設定：分群（原料 + 成品清單） -->
      <div v-else-if="currentPageStock === 'two-2'" class="form-wrapper">
        <h5 class="title">品項設定</h5>

        <!-- 新增原料 -->
        <div class="mb-3 p-2 border rounded text-start">
          <div class="fw-bold mb-2">新增原料</div>
          <div class="d-flex gap-2">
            <input placeholder="新原料名稱" v-model="newRaw.name" style="max-width:240px;" />
            <input type="number" step="0.01" min="0" placeholder="售價(可留空)" v-model.number="newRaw.salePrice" style="max-width:160px;" />
            <button class="update-btn" @click="addRawItem">新增原料</button>
          </div>
        </div>

        <!-- 各原料群組 -->
        <div v-for="g in groups" :key="g.raw._id" class="group">
          <div class="group-head">
            <!-- 原料資訊 -->
            <div class="group-title">原料</div>
            <div class="group-grid">
              <div>
                <span class="muted">品項名稱：</span>
                <template v-if="itemEditingId === g.raw._id">
                  <input v-model="g.raw.name" />
                </template>
                <template v-else>{{ g.raw.name }}</template>
              </div>
              <div>
                <span class="muted">售價：</span>
                <template v-if="itemEditingId === g.raw._id">
                  <input type="number" step="0.01" min="0" v-model.number="g.raw.salePrice" style="max-width:140px;" />
                </template>
                <template v-else>{{ Number(g.raw.salePrice || 0).toFixed(2) }}</template>
              </div>
              <div class="text-end">
                <template v-if="itemEditingId === g.raw._id">
                  <button class="update-btn" @click="confirmEditItem(g.raw)">存</button>
                </template>
                <template v-else>
                  <button class="update-btn" @click="startEditItem(g.raw._id)">改</button>
                  <button class="delete-btn ms-2" @click="deleteItem(g.raw._id)">刪</button>
                </template>
              </div>
            </div>
          </div>

          <!-- 綁定的成品清單 -->
          <div class="group-body">
            <div class="group-title sub">成品（綁定原料：{{ g.raw.name }}）</div>
            <table class="table">
              <thead><tr><th>成品名稱</th><th>售價</th><th>每份原料用量</th><th style="width:120px;"></th></tr></thead>
              <tbody>
                <tr v-for="p in g.products" :key="p._id">
                  <td>
                    <template v-if="itemEditingId === p._id"><input v-model="p.name" /></template>
                    <template v-else>{{ p.name }}</template>
                  </td>
                  <td style="max-width:160px;">
                    <template v-if="itemEditingId === p._id"><input type="number" step="0.01" min="0" v-model.number="p.salePrice" /></template>
                    <template v-else>{{ Number(p.salePrice || 0).toFixed(2) }}</template>
                  </td>
                  <td style="max-width:160px;">
                    <template v-if="itemEditingId === p._id"><input type="number" step="0.01" min="0.01" v-model.number="p.ratio" /></template>
                    <template v-else>{{ Number(p.ratio || 0).toFixed(2) }}</template>
                  </td>
                  <td class="text-center">
                    <template v-if="itemEditingId === p._id">
                      <button class="update-btn" @click="confirmEditItem(p)">存</button>
                    </template>
                    <template v-else>
                      <button class="update-btn" @click="startEditItem(p._id)">改</button>
                      <button class="delete-btn ms-2" @click="deleteItem(p._id)">刪</button>
                    </template>
                  </td>
                </tr>

                <!-- 在此原料下新增成品 -->
                <tr>
                  <td><input placeholder="新成品名稱" v-model="np(g.raw.name).name" /></td>
                  <td><input type="number" step="0.01" min="0" placeholder="售價" v-model.number="np(g.raw.name).salePrice" /></td>
                  <td><input type="number" step="0.01" min="0.01" placeholder="每份原料用量" v-model.number="np(g.raw.name).ratio" /></td>
                  <td class="text-center"><button class="update-btn" @click="addProductUnder(g.raw.name)">新增</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 出庫（選成品；扣原料） -->
    <div v-if="currentPage === 'three'">
      <div v-if="currentPage3 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'two-2' }" @click="() => { currentPage3 = 'two-2'; fetchRecords2() }">出庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">商品出庫</h5>

          <div class="d-flex justify-content-center mt-2 mb-1" style="font-size:12px;color:#666;" v-if="selectedBinding">
            <div>會扣原料：<b>{{ selectedBinding.rawName }}</b>，每份用量：<b>{{ Number(selectedBinding.ratio).toFixed(2) }}</b></div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate3" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>成品</th><th>份數</th><th>原料平均單價</th><th>備註</th></tr></thead>
            <tbody>
              <tr>
                <td><div type="button" class="clear" @click="clearOut">空</div></td>
                <td class="items">
                  <select v-model="outRow.item">
                    <option v-for="option in outOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="outRow.quantity" min="0.01" step="0.01" /></td>
                <td>
                  <div class="price-text">
                    <template v-if="selectedBinding">{{ getAvgPrice(selectedBinding.rawName).toFixed(2) }}</template>
                    <template v-else>—</template>
                  </div>
                </td>
                <td><input class="note" v-model="outRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end"><button class="btn text-center ms-2" @click="submitOut">送出</button></div>
        </div>
      </div>

      <div v-else-if="currentPage3 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'one-1' }" @click="currentPage3 = 'one-1'">新增出庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">出庫總覽查詢（按原料）</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate4" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">原料&ensp;:</div>
              <select v-model="selectedItem2" style="min-height:42px;font-size:14px;flex:1;">
                <option value=""></option>
                <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>原料</th><th>扣量</th><th>整筆金額</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
            <tbody>
              <tr v-for="record in recordList2" :key="record._id">
                <td class="button">
                  <template v-if="editingId === record._id">
                    <button class="delete-btn" @click="deleteRecord2(record._id)">刪</button>
                  </template>
                  <template v-else>
                    <button class="update-btn" @click="startEditRecord2(record._id)">改</button>
                  </template>
                </td>

                <td class="items">
                  <template v-if="editingId === record._id">
                    <select v-model="record.item">
                      <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.quantity" min="0.01" step="0.01" /></template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="price">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.price" min="0" step="0.01" /></template>
                  <template v-else>{{ Number(record.price).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id"><input v-model="record.note" /></template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <template v-if="editingId === record._id"><button class="update-btn" style="padding:6px 10px;" @click="confirmEdit2">確認</button></template>
                    <template v-else>{{ record.date }}</template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>

    <!-- 報表 -->
    <div v-if="currentPage === 'four'">
      <!-- 報表紀錄（只顯示成品；成本依綁定原料即時計算） -->
      <div v-if="currentPage4 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'two-2' }" @click="() => { currentPage4 = 'two-2'; fetchReportsList() }">報表總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表紀錄</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate5" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table class="text-center align-middle">
            <thead><tr><th>成品</th><th>份數 × 售價</th><th>營業收入</th><th>銷貨成本（原料×用量）</th></tr></thead>
            <tbody>
              <tr v-for="it in productItems" :key="it._id">
                <td>{{ it.name }}</td>
                <td class="d-flex justify-content-center align-items-center gap-2">
                  <input v-model.number="reportQty[it.name]" type="number" min="0" step="1" class="form-control text-center report" style="display:inline-block;" />
                  <span>× {{ Number(it.salePrice || 0).toFixed(0) }}</span>
                </td>
                <td>{{ ((Number(reportQty[it.name] || 0)) * Number(it.salePrice || 0)).toFixed(0) }}</td>
                <td>{{ costOfProduct(it).toFixed(2) }}</td>
              </tr>

              <tr><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td></tr>

              <tr class="total-row">
                <td>總計</td>
                <td></td>
                <td>{{ revenueTotal.toFixed(0) }}</td>
                <td>{{ costTotal.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-center align-items-center gap-3 mt-3">
            <label>固定支出：</label>
            <input v-model.number="fixedExpense" type="number" min="0" step="1" class="form-control text-center report2" />
          </div>
          <div class="d-flex justify-content-center align-items-center gap-3 mt-2">
            <label>額外支出：</label>
            <input v-model.number="extraExpense" type="number" min="0" step="1" class="form-control text-center report2" />
          </div>
          <div class="d-flex justify-content-center align-items-center gap-3 mt-2">
            <div class="fw-bold">淨利：</div>
            <div>{{ netProfit.toFixed(2) }}</div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <button class="btn" style="min-width:200px;" @click="submitReport">送出報表</button>
          </div>
        </div>
      </div>

      <!-- 報表總攬 -->
      <div v-else-if="currentPage4 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'one-1' }" @click="currentPage4 = 'one-1'">報表紀錄</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表總攬</h5>

          <div v-if="isReportsLoading" style="font-size:14px;color:#888;">載入中...</div>
          <div v-else>
            <div v-if="reportList.length > 0" style="font-size:14px;">
              <table class="table report-table">
                <thead><tr><th>日期</th><th>筆數</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="r in reportList" :key="r._id">
                    <td>{{ r.date }}</td>
                    <td>{{ Array.isArray(r.items) ? r.items.length : 0 }}</td>
                    <td class="text-center"><button class="delete-btn" @click="deleteReportByDate(r.date)">刪</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="font-size:14px;color:#888;">目前無資料</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item { background-color:#b2afaf; width:50%; cursor:pointer; transition:background-color .2s; box-shadow:2px 2px 8px rgba(0,0,0,.2);}
.item.active { background-color:#6c6d6e; color:#fff; }
.page-content { padding:20px; min-height:200px; text-align:center; font-size:1.2rem; }
input[type="date"] { padding:8px 24px; font-size:1rem; border:1px solid #ccc; border-radius:4px; width:50%; }
.btn { background-color:#b2afaf; padding:10px; border-radius:4px; cursor:pointer; transition:background-color .2s; font-size:12px; width:20%; white-space:nowrap; }
.btn:hover { background-color:#6c6d6e; color:#fff; }
.form-wrapper { max-width:980px; margin:20px auto; padding:10px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.1); }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th, td { border:none; padding:6px; text-align:center; font-size:12px; }
input { width:100%; padding:4px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; }
.delete-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#8d0205; color:#fff; padding:6px; }
.update-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
select { width:100%; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; }
td select, td input { min-height:30px; }
.items{ min-width:120px; }
.qty, .price, .price-text, .note { min-width:80px; }
.button{ max-width:20px; padding-left:0!important; padding-right:25px!important; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.title{ color:#f00; margin-bottom:1rem; }
.clear{ border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
.report{ max-width:70px; }
.report2{ max-width:120px; }

.total-row > td { position:relative; padding-top:16px; }
.total-row > td::before { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:#666; }
.total-row > td:first-child::before { left:20%; width:100%; }
.total-row > td:last-child::before { width:80%; }

.report-table tbody tr { height:56px; }
.report-table tbody td { vertical-align:middle; }

/* 群組樣式 */
.group { border:1px solid #e5e5e5; border-radius:8px; margin-bottom:16px; overflow:hidden; }
.group-head { background:#fafafa; padding:10px 12px; }
.group-body { padding:10px 12px; }
.group-title { font-weight:700; margin-bottom:8px; }
.group-title.sub { font-weight:600; color:#333; }
.group-grid { display:grid; grid-template-columns: 1fr 1fr auto; gap:10px; align-items:center; }
.muted { color:#666; }
</style>
