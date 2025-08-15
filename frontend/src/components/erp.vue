<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// 同網域部署留空；若固定外部網域就填完整網址
const API = ''

// 頁籤
const currentPage = ref('one')     // 入庫 / 庫存 / 出庫 / 報表
const currentPage2 = ref('one-1')  // 入庫子頁
const currentPage3 = ref('one-1')  // 出庫子頁
const currentPage4 = ref('one-1')  // 報表子頁
const currentPage5 = ref('one-1')  // 庫存子頁（one-1: 總覽 / two-2: 品項設定）

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)
const selectedDate6 = ref('')

// 入/出庫資料
const recordList = ref([])
const recordList2 = ref([])

// 單筆輸入
const inRow = ref({ item: '', quantity: '', price: '', note: '' })
const outRow = ref({ item: '', quantity: '', note: '' })

// 品項（在「庫存 → 品項設定」維護）
const items = ref([]) // { _id, name, salePrice }
const newItem = ref({ name: '', salePrice: '' })
const editingItemId = ref(null)

async function fetchItems () {
  const { data } = await axios.get(`${API}/items`)
  items.value = data || []
}
// ── 品項 CRUD（補上這四個方法） ──
const startEditItem = (id) => {
  editingItemId.value = id
}

const confirmEditItem = async (itm) => {
  const name = (itm.name || '').trim()
  if (!name) { alert('❌ 請輸入品項名稱'); return }
  try {
    await axios.put(`${API}/items/${itm._id}`, {
      name,
      salePrice: Number(itm.salePrice || 0)
    })
    editingItemId.value = null
    await fetchItems()         // 重新取得品項
    ensureQtyMapSync()         // 與報表份數欄同步
  } catch (e) {
    alert('❌ 更新失敗：' + (e?.response?.data?.error || e.message))
  }
}

const addItem = async () => {
  const name = (newItem.value.name || '').trim()
  if (!name) { alert('❌ 請輸入品項名稱'); return }
  if (items.value.some(i => i.name === name)) {
    alert('❌ 品項名稱重複'); return
  }
  try {
    await axios.post(`${API}/items`, {
      name,
      salePrice: Number(newItem.value.salePrice || 0)
    })
    newItem.value = { name: '', salePrice: '' }
    await fetchItems()
    ensureQtyMapSync()
  } catch (e) {
    alert('❌ 新增失敗：' + (e?.response?.data?.error || e.message))
  }
}

const deleteItem = async (id) => {
  const itm = items.value.find(i => i._id === id)
  if (!confirm(`確定要刪除「${itm?.name || ''}」嗎？`)) return
  try {
    await axios.delete(`${API}/items/${id}`)
    await fetchItems()
    ensureQtyMapSync()
    // 若入庫/出庫表單正選到被刪除的品項，順手清掉避免殘值
    if (inRow.value.item === itm?.name) inRow.value.item = ''
    if (outRow.value.item === itm?.name) outRow.value.item = ''
  } catch (e) {
    alert('❌ 刪除失敗：' + (e?.response?.data?.error || e.message))
  }
}

// 下拉清單
const itemOptions = computed(() => items.value.map(i => i.name))

// ===== 報表（動態） =====
// 每個品項的「份數」輸入，用 Map（name -> qty）
const qtyMap = ref({}) // { [itemName]: number }
function ensureQtyMapSync () {
  const map = { ...qtyMap.value }
  for (const it of items.value) {
    if (map[it.name] === undefined) map[it.name] = 0
  }
  // 移除不存在的舊鍵
  for (const k of Object.keys(map)) {
    if (!items.value.find(it => it.name === k)) delete map[k]
  }
  qtyMap.value = map
}
const salePriceOf = (name) => Number(items.value.find(i => i.name === name)?.salePrice || 0)

// 當日各品項「銷貨成本」(整筆金額合計)
const dailyCostByItem = ref({}) // { [itemName]: number }
function recomputeDailyCosts () {
  const d = selectedDate5.value
  if (!d) { dailyCostByItem.value = {}; return }
  const totals = {}
  for (const rec of recordList2.value) {
    if (rec.date !== d) continue
    totals[rec.item] = (totals[rec.item] || 0) + Number(rec.price || 0)
  }
  // 固定兩位
  for (const k of Object.keys(totals)) totals[k] = Number(totals[k].toFixed(2))
  dailyCostByItem.value = totals
}
const totalCostAll = computed(() =>
  Object.values(dailyCostByItem.value).reduce((s, v) => s + Number(v || 0), 0)
)

// 營收（逐品項 + 合計）
const revenueByItem = computed(() => {
  const r = {}
  for (const it of items.value) {
    const qty = Number(qtyMap.value[it.name] || 0)
    r[it.name] = qty * Number(it.salePrice || 0)
  }
  return r
})
const totalRevenue = computed(() =>
  Object.values(revenueByItem.value).reduce((s, v) => s + Number(v || 0), 0)
)

// 支出
const fixedExpense = ref('')
const extraExpense = ref('')

// 淨利
const netProfit = computed(() =>
  totalRevenue.value - totalCostAll.value - Number(fixedExpense.value || 0) - Number(extraExpense.value || 0)
)

// 讀/寫報表
async function loadReportForDate (dateStr) {
  if (!dateStr) return
  try {
    const { data } = await axios.get(`${API}/reports/${encodeURIComponent(dateStr)}`)
    if (data?.itemsQty && Array.isArray(data.itemsQty)) {
      const map = {}
      for (const it of data.itemsQty) map[it.name] = Number(it.qty || 0)
      qtyMap.value = map
    } else {
      // 舊資料或無資料 → 先清零
      qtyMap.value = {}
    }
    fixedExpense.value = Number(data?.fixedExpense ?? 0)
    extraExpense.value = Number(data?.extraExpense ?? 0)
  } catch {
    qtyMap.value = {}
    fixedExpense.value = 0
    extraExpense.value = 0
  } finally {
    ensureQtyMapSync()
  }
}

const isReportsLoading = ref(false)
const reportList = ref([]) // 全部報表（歷史）
const costsByDate = ref({}) // { [date]: number }  // 成本合計（所有品項）

async function fetchReportsList () {
  try {
    isReportsLoading.value = true
    const { data } = await axios.get(`${API}/reports`)
    reportList.value = (data || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    await fetchCostsForReports()
  } finally {
    isReportsLoading.value = false
  }
}

async function fetchCostsForReports () {
  const tasks = reportList.value.map(async (r) => {
    try {
      const { data } = await axios.get(`${API}/outrecords/totalByItem/${encodeURIComponent(r.date)}`)
      const totals = data?.totals || {}
      const sum = Object.values(totals).reduce((s, v) => s + Number(v || 0), 0)
      costsByDate.value[r.date] = Number(sum.toFixed(2))
    } catch {
      costsByDate.value[r.date] = 0
    }
  })
  await Promise.all(tasks)
}
function getCostSum (dateStr) { return Number(costsByDate.value[dateStr] || 0) }

// 以當前“品項設定”的售價重算歷史報表的收入與淨利（顯示用）
function computedNet (r) {
  // 收入：用 r.itemsQty * 目前 items 的售價
  let revenue = 0
  if (Array.isArray(r.itemsQty)) {
    for (const it of r.itemsQty) revenue += Number(it.qty || 0) * salePriceOf(it.name)
  } else {
    // 兼容舊資料（如果沒有 itemsQty）
    const firstTwo = items.value.slice(0, 2)
    if (firstTwo[0]) revenue += Number(r.qtyCake || 0) * Number(firstTwo[0].salePrice || 0)
    if (firstTwo[1]) revenue += Number(r.qtyJuice || 0) * Number(firstTwo[1].salePrice || 0)
  }
  const cost = getCostSum(r.date)
  const fe = Number(r.fixedExpense || 0)
  const ee = Number(r.extraExpense || 0)
  return revenue - cost - fe - ee
}

const isLoading = ref(false)

// ===== 入/出庫邏輯（原樣） =====
const isEmpty = (v) => v === '' || v === null || v === undefined
const isRowCompleteIn = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  !isEmpty(row.price) && Number(row.price) >= 0
const isRowCompleteOut = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  getAvgPrice(row.item) > 0

function checkOutStock () {
  const row = outRow.value
  if (!row.item || !row.quantity) return true
  const outQty = Number(row.quantity)

  const inQty = recordList.value
    .filter(r => r.item === row.item)
    .reduce((s, r) => s + Number(r.quantity), 0)

  const currentOutQty = recordList2.value
    .filter(r => r.item === row.item)
    .reduce((s, r) => s + Number(r.quantity), 0)

  if (outQty + currentOutQty > inQty) {
    const left = (inQty - currentOutQty).toFixed(2)
    alert(`【${row.item}】庫存不足，無法出庫 ${outQty}，目前庫存僅剩 ${left}`)
    return false
  }
  return true
}

const getAvgPrice = (item) => {
  const found = itemSummary.value.find(i => i.item === item)
  return found ? found.avgPrice : 0
}

// 入庫
const submitIn = async () => {
  const row = inRow.value
  if (!selectedDate.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteIn(row)) { alert('❌ 入庫：品項/數量/價格需填寫（數量>0，價格可為0）'); return }
  try {
    const payload = {
      item: row.item,
      quantity: Number(row.quantity),
      price: Number(Number(row.price).toFixed(2)),
      note: row.note || '',
      date: selectedDate.value
    }
    await axios.post(`${API}/records`, payload)
    alert('✅ 入庫成功')
    await fetchRecords3()
    inRow.value = { item: '', quantity: '', price: '', note: '' }
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// 出庫
const submitOut = async () => {
  const row = outRow.value
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteOut(row)) { alert('❌ 出庫：品項/數量需填（數量>0，平均單價>0）'); return }
  if (!checkOutStock()) return
  try {
    const qty = Number(row.quantity)
    const unit = Number(getAvgPrice(row.item))
    const lineTotal = Number((unit * qty).toFixed(2))
    const payload = {
      item: row.item,
      quantity: qty,
      price: lineTotal,
      note: row.note || '',
      date: selectedDate3.value
    }
    await axios.post(`${API}/outrecords`, payload)
    alert('✅ 出庫成功')
    await fetchRecords3()
    outRow.value = { item: '', quantity: '', note: '' }
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// 讀資料
const fetchRecords = async () => {
  try {
    let url = `${API}/records`
    const query = []
    if (selectedDate2.value) query.push('date=' + selectedDate2.value)
    if (selectedItem.value) query.push('item=' + encodeURIComponent(selectedItem.value))
    if (query.length) url += '?' + query.join('&')
    const { data } = await axios.get(url)
    recordList.value = data
  } catch (err) {
    alert('❌ 無法取得資料：' + err.message)
  }
}
const fetchRecords2 = async () => {
  try {
    let url = `${API}/outrecords`
    const query = []
    if (selectedDate4.value) query.push('date=' + selectedDate4.value)
    if (selectedItem2.value) query.push('item=' + encodeURIComponent(selectedItem2.value))
    if (query.length) url += '?' + query.join('&')
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

// 報表送出（以多品項 itemsQty 儲存）
const submitReport = async () => {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }

  // 檢核：全部都要是數字（可為 0）
  for (const name of Object.keys(qtyMap.value)) {
    const v = qtyMap.value[name]
    if (v === '' || v === null || v === undefined || isNaN(Number(v))) {
      alert('❌ 份數需填數字（可為0）'); return
    }
  }
  if (fixedExpense.value === '' || isNaN(Number(fixedExpense.value))) { alert('❌ 固定支出需為數字'); return }
  if (extraExpense.value === '' || isNaN(Number(extraExpense.value))) { alert('❌ 額外支出需為數字'); return }

  const itemsQty = items.value.map(it => ({
    name: it.name,
    qty: Number(qtyMap.value[it.name] || 0)
  }))

  const payload = {
    date: selectedDate5.value,
    itemsQty,
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

// 編修/刪除（入/出庫）
const editingId = ref(null)
const selectedItem = ref('')
const selectedItem2 = ref('')
const startEditRecord = (id) => { editingId.value = id }
const startEditRecord2 = (id) => { editingId.value = id }

const confirmEdit = async () => {
  const editingRecord = recordList.value.find(r => r._id === editingId.value)
  try { await axios.put(`${API}/records/${editingId.value}`, editingRecord); editingId.value = null; await fetchRecords() }
  catch (err) { alert('❌ 更新失敗：' + err.message) }
}
const confirmEdit2 = async () => {
  const editingRecord = recordList2.value.find(r => r._id === editingId.value)
  try {
    const api = currentPage.value === 'three' ? 'outrecords' : 'records'
    await axios.put(`${API}/${api}/${editingId.value}`, editingRecord)
    editingId.value = null
    currentPage.value === 'three' ? await fetchRecords2() : await fetchRecords()
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
  try {
    const api = currentPage.value === 'three' ? 'outrecords' : 'records'
    await axios.delete(`${API}/${api}/${id}`)
    currentPage.value === 'three' ? await fetchRecords2() : await fetchRecords()
  } catch (err) {
    alert('❌ 刪除失敗：' + err.message)
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

// 庫存彙總（僅針對 items 清單中的品項）
const itemSummary = computed(() => {
  const summary = []
  for (const item of itemOptions.value) {
    const inRecords = recordList.value.filter(r => r.item === item)
    const inQty = inRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const inSumPrice = inRecords.reduce((sum, r) => sum + Number(r.price), 0)

    const outRecords = recordList2.value.filter(r => r.item === item)
    const outQty = outRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const outSumPrice = outRecords.reduce((sum, r) => sum + Number(r.price), 0)

    const stockQty = inQty - outQty
    const stockTotalPrice = inSumPrice - outSumPrice
    const avgPrice = stockQty > 0 ? stockTotalPrice / stockQty : 0

    summary.push({ item, quantity: stockQty, avgPrice, totalPrice: stockTotalPrice })
  }
  return summary
})

const clearIn = () => { inRow.value = { item: '', quantity: '', price: '', note: '' } }
const clearOut = () => { outRow.value = { item: '', quantity: '', note: '' } }

// 掛載/監聽
onMounted(async () => {
  await fetchItems()
  ensureQtyMapSync()
  await fetchRecords3()
  recomputeDailyCosts()
  await loadReportForDate(selectedDate5.value)
})

watch([items], () => {
  ensureQtyMapSync()
  if (currentPage.value === 'four') recomputeDailyCosts()
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedDate6, currentPage],
  async () => {
    if (currentPage.value === 'two' || currentPage.value === 'three') {
      await fetchRecords3()
    } else if (currentPage.value === 'four') {
      await fetchRecords3()
      recomputeDailyCosts()
      if (selectedDate5.value) await loadReportForDate(selectedDate5.value)
    } else {
      await fetchRecords()
    }
  },
  { immediate: true }
)

// 當「日期 / 出庫資料」變動時，重算當日成本
watch([selectedDate5, recordList2], () => {
  if (currentPage.value === 'four') recomputeDailyCosts()
})

// 庫存子頁切換
watch(currentPage5, (p) => {
  if (currentPage.value !== 'two') return
  if (p === 'two-2') fetchItems()
})
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }" @click="() => { currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }" @click="() => { currentPage = 'two'; currentPage5 = 'one-1' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="() => { currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }" @click="() => { currentPage = 'four' ;currentPage4 = 'one-1'}">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫（維持原樣） -->
    <div v-if="currentPage === 'one'">
      <div v-if="currentPage2 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage2 === 'two-2' }" @click="() => { currentPage2 = 'two-2'; fetchRecords() }">入庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">商品入庫</h5>
          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;" />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th></th>
                <th>品項</th>
                <th>數量</th>
                <th>整筆價格</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><div class="clear" @click="clearIn" type="button">空</div></td>
                <td class="items">
                  <select v-model="inRow.item">
                    <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="inRow.quantity" min="0.01" step="0.01" /></td>
                <td><input type="number" class="price" v-model.number="inRow.price" min="0" step="0.01" /></td>
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
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage2 === 'one-1' }" @click="currentPage2 = 'one-1'">新增入庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">入庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate2" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3 mb-3">
            <div class="d-flex align-items-center gap-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">品項&ensp;:</div>
              <select v-model="selectedItem" style="min-height: 42px; font-size: 14px; min-width: 0; flex: 1;">
                <option value=""></option>
                <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th></th>
                <th>品項</th>
                <th>數量</th>
                <th>整筆價格</th>
                <th>備註</th>
                <th v-if="!editingId">日期</th>
              </tr>
            </thead>
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
                      <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id">
                    <input type="number" v-model.number="record.quantity" min="0.01" step="0.01" />
                  </template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="price">
                  <template v-if="editingId === record._id">
                    <input type="number" v-model.number="record.price" min="0" step="0.01" />
                  </template>
                  <template v-else>{{ Number(record.price).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id">
                    <input v-model="record.note" />
                  </template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
                    <template v-if="editingId === record._id">
                      <button class="update-btn" style="padding: 6px 10px;" @click="confirmEdit">確認</button>
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
      <div v-if="currentPage5 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage5 === 'two-2' }" @click="() => { currentPage5 = 'two-2'; fetchItems() }">品項設定</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">庫存總覽</h5>

        <div v-if="isLoading" style="font-size: 14px; color: #888;">載入中...</div>
        <div v-else>
          <div v-if="itemSummary.length > 0" style="font-size: 14px;">
            <table class="table">
              <thead>
                <tr>
                  <th>品項</th>
                  <th>數量</th>
                  <th>平均單價</th>
                  <th>總價</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in itemSummary" :key="index">
                  <td>{{ record.item }}</td>
                  <td>{{ Number(record.quantity).toFixed(2) }}</td>
                  <td>{{ Number(record.avgPrice).toFixed(2) }}</td>
                  <td>{{ Number(record.totalPrice).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="font-size: 14px; color: #888;">目前無資料</div>
        </div>
        </div>
      </div>

      <div v-else-if="currentPage5 === 'two-2'">
        <div class="d-flex justify內容-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage5 === 'one-1' }" @click="currentPage5 = 'one-1'">庫存總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">品項設定</h5>

          <table>
            <thead>
              <tr>
                <th>品項名稱</th>
                <th>售價（報表單價）</th>
                <th style="width:120px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="itm in items" :key="itm._id">
                <td>
                  <template v-if="editingItemId === itm._id">
                    <input v-model="itm.name" />
                  </template>
                  <template v-else>{{ itm.name }}</template>
                </td>
                <td>
                  <template v-if="editingItemId === itm._id">
                    <input type="number" v-model.number="itm.salePrice" min="0" step="1" />
                  </template>
                  <template v-else>{{ Number(itm.salePrice).toFixed(0) }}</template>
                </td>
                <td>
                  <template v-if="editingItemId === itm._id">
                    <button class="update-btn" @click="confirmEditItem(itm)">存</button>
                  </template>
                  <template v-else>
                    <button class="update-btn" @click="startEditItem(itm._id)">改</button>
                    <button class="delete-btn" style="margin-left:6px" @click="deleteItem(itm._id)">刪</button>
                  </template>
                </td>
              </tr>
              <tr>
                <td><input v-model="newItem.name" placeholder="新增品項" /></td>
                <td><input type="number" v-model.number="newItem.salePrice" min="0" step="1" placeholder="售價" /></td>
                <td><button class="update-btn" @click="addItem">新增</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 出庫 -->
    <div v-if="currentPage === 'three'">
      <div v-if="currentPage3 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage3 === 'two-2' }" @click="() => { currentPage3 = 'two-2'; fetchRecords2() }">出庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">商品出庫</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate3" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;" />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th></th>
                <th>品項</th>
                <th>數量</th>
                <th>平均單價</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><div type="button" class="clear" @click="clearOut">空</div></td>
                <td class="items">
                  <select v-model="outRow.item">
                    <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="outRow.quantity" min="0.01" step="0.01" /></td>
                <td><div class="price-text">{{ getAvgPrice(outRow.item).toFixed(2) }}</div></td>
                <td><input class="note" v-model="outRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end">
            <button class="btn text-center ms-2" @click="submitOut">送出</button>
          </div>
        </div>
      </div>

      <div v-else-if="currentPage3 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage3 === 'one-1' }" @click="currentPage3 = 'one-1'">新增出庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">出庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate4" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">品項&ensp;:</div>
              <select v-model="selectedItem2" style="min-height: 42px; font-size: 14px; min-width: 0; flex: 1;">
                <option value=""></option>
                <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th></th>
                <th>品項</th>
                <th>數量</th>
                <th>整筆價格</th>
                <th>備註</th>
                <th v-if="!editingId">日期</th>
              </tr>
            </thead>
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
                      <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id">
                    <input type="number" v-model.number="record.quantity" min="0.01" step="0.01" />
                  </template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="price">
                  <template v-if="editingId === record._id">
                    <!-- 僅顯示，禁止輸入 -->
                    <input type="number" v-model.number="record.price" min="0" step="0.01" disabled />
                  </template>
                  <template v-else>{{ Number(record.price).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id">
                    <input v-model="record.note" />
                  </template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
                    <template v-if="editingId === record._id">
                      <button class="update-btn" style="padding: 6px 10px;" @click="confirmEdit2">確認</button>
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

    <!-- 報表（動態列） -->
    <div v-if="currentPage === 'four'">
      <div v-if="currentPage4 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage4 === 'two-2' }" @click="() => { currentPage4 = 'two-2'; fetchReportsList() }">報表總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表紀錄</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate5" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;"
                     @change="() => { recomputeDailyCosts(); loadReportForDate(selectedDate5) }" />
            </div>
          </div>

          <table class="text-center align-middle">
            <thead>
              <tr>
                <th>品項</th>
                <th>份數 × 單價</th>
                <th>營業收入</th>
                <th>銷貨成本</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in items" :key="it._id">
                <td>{{ it.name }}</td>
                <td class="d-flex justify-content-center align-items-center gap-2">
                  <input
                    v-model.number="qtyMap[it.name]"
                    type="number" min="0" step="1"
                    class="form-control text-center report" style="display: inline-block;" />
                  <span>× {{ Number(it.salePrice || 0) }}</span>
                </td>
                <td>{{ (Number(qtyMap[it.name] || 0) * Number(it.salePrice || 0)).toFixed(0) }}</td>
                <td>{{ Number(dailyCostByItem[it.name] || 0).toFixed(2) }}</td>
              </tr>

              <tr><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td></tr>

              <tr class="total-row">
                <td>總計</td>
                <td></td>
                <td>{{ totalRevenue.toFixed(0) }}</td>
                <td>{{ totalCostAll.toFixed(2) }}</td>
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
            <button class="btn" style="min-width: 200px;" @click="submitReport">送出報表</button>
          </div>
        </div>
      </div>

      <!-- 報表總攬（以新成本 API 加總所有品項成本） -->
      <div v-else-if="currentPage4 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage4 === 'one-1' }" @click="currentPage4 = 'one-1'">報表紀錄</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表總攬</h5>

          <div v-if="isReportsLoading" style="font-size: 14px; color: #888;">載入中...</div>

          <div v-else>
            <div v-if="reportList.length > 0" style="font-size: 14px;">
              <table class="table report-table">
                <thead>
                  <tr><th>日期</th><th>淨利</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in reportList" :key="r._id">
                    <td>{{ r.date }}</td>
                    <td>{{ computedNet(r).toFixed(2) }}</td>
                    <td class="text-center">
                      <button class="delete-btn" @click="deleteReportByDate(r.date)">刪</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="font-size: 14px; color: #888;">目前無資料</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item { background-color: #b2afaf; width: 50%; cursor: pointer; transition: background-color .2s; box-shadow: 2px 2px 8px rgba(0,0,0,.2);}
.item.active { background-color: #6c6d6e; color: #fff; }
.page-content { padding: 20px; min-height: 200px; text-align: center; font-size: 1.2rem; }
input[type="date"] { padding: 8px 24px; font-size: 1rem; border:1px solid #ccc; border-radius: 4px; width: 50%; }
.btn { background-color:#b2afaf; padding:10px; border-radius:4px; cursor:pointer; transition: background-color .2s; font-size:12px; width:20%; white-space:nowrap; }
.btn:hover { background-color:#6c6d6e; color:#fff; }
.form-wrapper { max-width:800px; margin:20px auto; padding:10px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.1); }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th, td { border:none; padding:4px; text-align:center; font-size:12px; }
input { width:100%; padding:4px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; }
.delete-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#8d0205; color:#fff; padding:6px; }
.update-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
select { width:100%; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; }
td select, td input { min-height:30px; }
.items{ min-width:80px; }
.qty, .price, .price-text, .note { min-width:60px; }
.button{ max-width:20px; padding-left:0!important; padding-right:25px!important; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.title{ color:#f00; margin-bottom:1rem; }
.clear{ border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
.report{ max-width:50px; }
.report2{ max-width:100px; }
.total-row > td { position:relative; padding-top:16px; }
.total-row > td::before { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:#666; }
.total-row > td:first-child::before { left:20%; width:100%; }
.total-row > td:last-child::before { width:80%; }
.report-table tbody tr { height:56px; }
.report-table tbody td { vertical-align:middle; }
</style>
