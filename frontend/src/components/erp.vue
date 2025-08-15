<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// === API Base ===
const API = 'https://erp-ahup.onrender.com'  // 同網域可改成 ''

// === 分頁狀態 ===
const currentPage = ref('one')
const currentPage2 = ref('one-1')
const currentPage3 = ref('one-1')
const currentPage4 = ref('one-1')

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)
const selectedDate6 = ref('')

// 資料
const recordList = ref([])
const recordList2 = ref([])
const editingId = ref(null)
const selectedItem = ref('')
const selectedItem2 = ref('')

const itemOptions = ['檸檬汁', '蘋果汁']

const isLoading = ref(false)

// 報表用
const totalGroup1 = ref('') // 檸檬汁成本（初始空字串避免一開始就顯示 0）
const totalGroup2 = ref('') // 蘋果汁成本
const qtyCake = ref('')     // 對應「檸檬汁份數」
const qtyJuice = ref('')    // 對應「蘋果汁份數」

const unitPriceCake = 50
const unitPriceJuice = 60
const revenueCake = computed(() => Number(qtyCake.value || 0) * unitPriceCake)
const revenueJuice = computed(() => Number(qtyJuice.value || 0) * unitPriceJuice)

const fixedExpense = ref('')
const extraExpense = ref('')
const netProfit = computed(() =>
  (revenueCake.value + revenueJuice.value)
  - (Number(totalGroup1.value || 0) + Number(totalGroup2.value || 0))
  - Number(fixedExpense.value || 0)
  - Number(extraExpense.value || 0)
)

// ====== 共用檢核 ======
const isEmpty = (v) => v === '' || v === null || v === undefined

const isRowEmptyIn = (row) => !row.item && isEmpty(row.quantity) && isEmpty(row.price)
const isRowCompleteIn = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  !isEmpty(row.price) && Number(row.price) >= 0

const isRowEmptyOut = (row) => !row.item && isEmpty(row.quantity)
const isRowCompleteOut = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  getAvgPrice(row.item) > 0

function checkOutStock () {
  const outQtyMap = {}
  for (const row of rows2.value) {
    if (!row.item || !row.quantity) continue
    if (!outQtyMap[row.item]) outQtyMap[row.item] = 0
    outQtyMap[row.item] += Number(row.quantity)
  }
  for (const item in outQtyMap) {
    const outQty = outQtyMap[item]
    const inQty = recordList.value.filter(r => r.item === item).reduce((s, r) => s + Number(r.quantity), 0)
    const currentOutQty = recordList2.value.filter(r => r.item === item).reduce((s, r) => s + Number(r.quantity), 0)
    if (outQty + currentOutQty > inQty) {
      const left = (inQty - currentOutQty).toFixed(2)
      alert(`【${item}】庫存不足，無法出庫 ${outQty}，目前庫存僅剩 ${left}`)
      return false
    }
  }
  return true
}

const getAvgPrice = (item) => {
  const found = itemSummary.value.find(i => i.item === item)
  return found ? found.avgPrice : 0
}

// 入/出庫輸入列
const rows = ref(Array.from({ length: 5 }, () => ({ item: '', quantity: '', price: '', note: '' })))
const rows2 = ref(Array.from({ length: 5 }, () => ({ item: '', quantity: '', price: '', note: '' })))

// 送出入庫（price 為整筆金額）
const submitAll = async () => {
  if (!selectedDate.value) { alert('❌ 請選擇日期'); return }
  const hasIncomplete = rows.value.some(r => !isRowEmptyIn(r) && !isRowCompleteIn(r))
  if (hasIncomplete) { alert('❌ 入庫：每一列要嘛空白、要嘛品項/數量/價格都填好（數量 > 0，價格可為 0 並接受小數）'); return }
  const validRows = rows.value.filter(isRowCompleteIn)
  if (validRows.length === 0) { alert('❌ 入庫：請至少填寫一列完整資料'); return }

  try {
    const dataWithDate = validRows.map(row => ({
      ...row,
      quantity: Number(row.quantity),
      price: Number(Number(row.price).toFixed(2)), // 整筆金額
      date: selectedDate.value
    }))
    const { data } = await axios.post(`${API}/records`, dataWithDate)
    alert(`✅ 共送出 ${data.inserted} 筆入庫資料`)
    await fetchRecords3()
    rows.value = Array.from({ length: 5 }, () => ({ item: '', quantity: '', price: '', note: '' }))
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// 送出出庫（price = 平均單價 × 數量，存成整筆金額）
const submitAll2 = async () => {
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  const hasIncomplete = rows2.value.some(r => !isRowEmptyOut(r) && !isRowCompleteOut(r))
  if (hasIncomplete) { alert('❌ 出庫：每一列要嘛空白、要嘛品項/數量都填好（數量需 > 0，且平均單價需 > 0）'); return }
  const validRows = rows2.value.filter(isRowCompleteOut)
  if (validRows.length === 0) { alert('❌ 出庫：請至少填寫一列完整資料'); return }
  if (!checkOutStock()) return

  try {
    const dataWithDate = validRows.map(row => {
      const qty = Number(row.quantity)
      const unit = Number(getAvgPrice(row.item))
      const lineTotal = Number((unit * qty).toFixed(2)) // 整筆金額
      return { ...row, quantity: qty, price: lineTotal, date: selectedDate3.value }
    })
    const { data } = await axios.post(`${API}/outrecords`, dataWithDate)
    alert(`✅ 共送出 ${data.inserted} 筆出庫資料`)
    await fetchRecords3()
    rows2.value = Array.from({ length: 5 }, () => ({ item: '', quantity: '', price: '', note: '' }))
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// 讀入/出庫
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

// 報表單日成本（後端已改為整筆加總）
const fetchTotalAmount = async () => {
  if (!selectedDate5.value) { totalGroup1.value = ''; totalGroup2.value = ''; return }
  try {
    const { data } = await axios.get(`${API}/outrecords/total/${selectedDate5.value}`)
    totalGroup1.value = Number(data?.totalGroup1 || 0)
    totalGroup2.value = Number(data?.totalGroup2 || 0)
  } catch (_e) {
    totalGroup1.value = ''
    totalGroup2.value = ''
  }
}

// 自動帶入報表
const isAutofilling = ref(false)
async function loadReportForDate (dateStr) {
  if (!dateStr) return
  try {
    const { data } = await axios.get(`${API}/reports/${encodeURIComponent(dateStr)}`)
    isAutofilling.value = true
    if (data) {
      const cake = data?.qtyCake ?? 0
      const juice = data?.qtyJuice ?? 0
      qtyCake.value = Number(cake) || 0
      qtyJuice.value = Number(juice) || 0
      fixedExpense.value = Number(data?.fixedExpense ?? 0)
      extraExpense.value = Number(data?.extraExpense ?? 0)
    } else {
      qtyCake.value = 0; qtyJuice.value = 0; fixedExpense.value = 0; extraExpense.value = 0
    }
  } catch (_e) {
    isAutofilling.value = true
    qtyCake.value = 0; qtyJuice.value = 0; fixedExpense.value = 0; extraExpense.value = 0
  } finally {
    setTimeout(() => { isAutofilling.value = false }, 0)
  }
}

// 報表總攬
const reportList = ref([])
const costsByDate = ref({})
const isReportsLoading = ref(false)

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
      const { data } = await axios.get(`${API}/outrecords/total/${encodeURIComponent(r.date)}`)
      const { totalGroup1 = 0, totalGroup2 = 0 } = data || {}
      costsByDate.value[r.date] = { g1: Number(totalGroup1) || 0, g2: Number(totalGroup2) || 0 }
    } catch {
      costsByDate.value[r.date] = { g1: 0, g2: 0 }
    }
  })
  await Promise.all(tasks)
}
function getCosts (dateStr) {
  return costsByDate.value[dateStr] || { g1: 0, g2: 0 }
}
function getQtyCake (r) { return Number(r?.qtyCake ?? 0) }
function getQtyJuice (r) { return Number(r?.qtyJuice ?? 0) }
function revenuePerItem (qty, unitPrice) { return Number(qty) * unitPrice }
function storedNet (r) {
  const n = r?.netProfit
  return (n === 0 || (typeof n === 'number' && !Number.isNaN(n))) ? Number(n) : null
}
function computedNet (r) {
  const c = getCosts(r.date)
  const revenue = revenuePerItem(getQtyCake(r), unitPriceCake) + revenuePerItem(getQtyJuice(r), unitPriceJuice)
  const cost = Number(c.g1) + Number(c.g2)
  const fe = Number(r.fixedExpense || 0)
  const ee = Number(r.extraExpense || 0)
  return revenue - cost - fe - ee
}
function dailyNet (r) {
  const s = storedNet(r)
  return s !== null ? s : computedNet(r)
}

// 列表編修（入/出庫）
const confirmEdit = async () => {
  const editingRecord = recordList.value.find(r => r._id === editingId.value)
  try {
    await axios.put(`${API}/records/${editingId.value}`, editingRecord)
    editingId.value = null
    await fetchRecords()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
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
const startEditRecord = (id) => { editingId.value = id }
const startEditRecord2 = (id) => { editingId.value = id }
const deleteRecord = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try {
    await axios.delete(`${API}/records/${id}`)
    await fetchRecords()
  } catch (err) {
    alert('❌ 刪除失敗：' + err.message)
  }
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

// 庫存彙總（價格用整筆加總）
const itemSummary = computed(() => {
  const summary = []
  for (const item of itemOptions) {
    const inRecords = recordList.value.filter(r => r.item === item)
    const inQty = inRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const inSumPrice = inRecords.reduce((sum, r) => sum + Number(r.price), 0) // 整筆加總

    const outRecords = recordList2.value.filter(r => r.item === item)
    const outQty = outRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const outSumPrice = outRecords.reduce((sum, r) => sum + Number(r.price), 0) // 整筆加總

    const stockQty = inQty - outQty
    const stockTotalPrice = inSumPrice - outSumPrice
    const avgPrice = stockQty > 0 ? stockTotalPrice / stockQty : 0
    summary.push({ item, quantity: stockQty, avgPrice, totalPrice: stockTotalPrice })
  }
  return summary
})

function clearRow (index) { rows.value[index] = { item: '', quantity: '', price: '', note: '' } }
function clearRow2 (index) { rows2.value[index] = { item: '', quantity: '', price: '', note: '' } }

// 掛載 / 監聽
onMounted(() => {
  if (currentPage.value === 'two') fetchRecords3()
  else if (currentPage.value === 'three') fetchRecords3()
  else if (currentPage.value === 'four') {
    fetchTotalAmount()
    loadReportForDate(selectedDate5.value)
  } else {
    fetchRecords()
  }
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedDate6, selectedItem, selectedItem2, currentPage],
  () => {
    if (currentPage.value === 'two') {
      fetchRecords3()
    } else if (currentPage.value === 'three') {
      fetchRecords3()
    } else if (currentPage.value === 'four') {
      fetchTotalAmount()
      if (selectedDate5.value) loadReportForDate(selectedDate5.value)
    } else {
      fetchRecords()
    }
  },
  { immediate: true }
)

watch(currentPage4, (p) => {
  if (currentPage.value === 'four' && p === 'two-2') {
    fetchReportsList()
  }
})

// 報表規則
watch(qtyCake, (q) => {
  if (Number(totalGroup1.value || 0) === 0 && Number(q) > 0) {
    if (!isAutofilling.value) alert('❌ 檸檬汁的「銷貨成本」為 0，份數必須為 0')
    qtyCake.value = 0
  }
})
watch(qtyJuice, (q) => {
  if (Number(totalGroup2.value || 0) === 0 && Number(q) > 0) {
    if (!isAutofilling.value) alert('❌ 蘋果汁的「銷貨成本」為 0，份數必須為 0')
    qtyJuice.value = 0
  }
})

const submitReport = async () => {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }
  const mustNumber = (val) => !(val === '' || val === null || val === undefined) && !isNaN(Number(val))
  if (!mustNumber(qtyCake.value)) { alert('❌ 請填寫檸檬汁份數（可為 0）'); return }
  if (!mustNumber(qtyJuice.value)) { alert('❌ 請填寫蘋果汁份數（可為 0）'); return }
  if (!mustNumber(fixedExpense.value)) { alert('❌ 請填寫固定支出（可為 0）'); return }
  if (!mustNumber(extraExpense.value)) { alert('❌ 請填寫額外支出（可為 0）'); return }

  if (Number(totalGroup1.value || 0) === 0 && Number(qtyCake.value) > 0) { alert('❌ 檸檬汁成本為 0，份數必須為 0'); qtyCake.value = 0; return }
  if (Number(totalGroup2.value || 0) === 0 && Number(qtyJuice.value) > 0) { alert('❌ 蘋果汁成本為 0，份數必須為 0'); qtyJuice.value = 0; return }

  const payload = {
    date: selectedDate5.value,
    qtyCake: Number(qtyCake.value),
    qtyJuice: Number(qtyJuice.value),
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
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }" @click="() => { currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }" @click="() => { currentPage = 'two' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="() => { currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }" @click="() => { currentPage = 'four' ;currentPage4 = 'one-1'}">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫 -->
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
              <tr v-for="(row, index) in rows" :key="index">
                <td><div class="clear" @click="clearRow(index)" type="button">空</div></td>
                <td class="items">
                  <select v-model="row.item">
                    <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="row.quantity" min="0.01" step="0.01" /></td>
                <td><input type="number" class="price" v-model.number="row.price" min="0" step="0.01" /></td>
                <td><input class="note" v-model="row.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end">
            <button class="btn text-center ms-2" @click="submitAll">送出全部</button>
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
          <div v-else style="font-size: 14px; color: #888;">
            目前無資料
          </div>
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
              <tr v-for="(row, index) in rows2" :key="index">
                <td><div type="button" class="clear" @click="clearRow2(index)">空</div></td>
                <td class="items">
                  <select v-model="row.item">
                    <option v-for="option in itemOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="row.quantity" min="0.01" step="0.01" /></td>
                <td><div class="price-text">{{ getAvgPrice(row.item).toFixed(2) }}</div></td>
                <td><input class="note" v-model="row.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end">
            <button class="btn text-center ms-2" @click="submitAll2">送出全部</button>
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

    <!-- 報表 -->
    <div v-if="currentPage === 'four'">
      <!-- 報表紀錄 -->
      <div v-if="currentPage4 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPage4 === 'two-2' }" @click="() => { currentPage4 = 'two-2'; fetchReportsList() }">報表總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表紀錄</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width: 100%; max-width: 330px;">
              <div style="font-size:14px; white-space: nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate5" class="form-control" style="min-height: 42px;  min-width: 0; flex: 1;" />
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
              <tr>
                <td>檸檬汁</td>
                <td class="d-flex justify-content-center align-items-center gap-2">
                  <input v-model.number="qtyCake" type="number" min="0" step="1" class="form-control text-center report" style="display: inline-block;" />
                  <span>× {{ unitPriceCake }}</span>
                </td>
                <td>{{ revenueCake }}</td>
                <td>{{ totalGroup1 === '' ? '' : Number(totalGroup1).toFixed(2) }}</td>
              </tr>

              <tr>
                <td>蘋果汁</td>
                <td class="d-flex justify-content-center align-items-center gap-2">
                  <input v-model.number="qtyJuice" type="number" min="0" step="1" class="form-control text-center report" style="display: inline-block;" />
                  <span>× {{ unitPriceJuice }}</span>
                </td>
                <td>{{ revenueJuice }}</td>
                <td>{{ totalGroup2 === '' ? '' : Number(totalGroup2).toFixed(2) }}</td>
              </tr>

              <tr>
                <td>&ensp;</td>
                <td>&ensp;</td>
                <td>&ensp;</td>
                <td>&ensp;</td>
              </tr>

              <tr class="total-row">
                <td>總計</td>
                <td></td>
                <td>{{ (revenueCake + revenueJuice).toFixed(0) }}</td>
                <td>
                  {{
                    (totalGroup1 === '' && totalGroup2 === '')
                      ? ''
                      : (Number(totalGroup1 || 0) + Number(totalGroup2 || 0)).toFixed(2)
                  }}
                </td>
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

      <!-- 報表總攬 -->
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
                  <tr>
                    <th>日期</th>
                    <th>淨利</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in reportList" :key="r._id">
                    <td>{{ r.date }}</td>
                    <td>{{ dailyNet(r).toFixed(2) }}</td>
                    <td class="text-center">
                      <button class="delete-btn" @click="deleteReportByDate(r.date)">刪</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="font-size: 14px; color: #888;">
              目前無資料
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 原樣式維持 */
.item {
  background-color: #b2afaf;
  width: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
}
.item.active { background-color: #6c6d6e; color: white; }
.page-content {
  padding: 20px;
  min-height: 200px;
  text-align: center;
  font-size: 1.2rem;
}
input[type="date"] {
  padding: 8px 24px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 50%;
}
.btn {
  background-color: #b2afaf;
  padding:10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 12px;
  width: 20%;
  white-space: nowrap;
}
.btn:hover { background-color: #6c6d6e; color: #ffffff; }
.form-wrapper {
  max-width: 800px;
  margin: 20px auto;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
th, td { border: none; padding: 4px; text-align: center; font-size: 12px; }
input {
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.delete-btn {
  border: none;
  font-size: 8px;
  cursor: pointer;
  border-radius: 15px;
  background-color: #8d0205;
  color:#ffffff;
  padding: 6px;
}
.update-btn{
  border: none;
  font-size: 8px;
  cursor: pointer;
  border-radius: 15px;
  background-color: #1d35d0;
  color:#ffffff;
  padding: 6px;
}
select { width: 100%; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
td select, td input { min-height: 30px; }
.items{ min-width: 80px; }
.qty { min-width: 60px; }
.price { min-width: 60px; }
.price-text{ min-width: 60px; }
.note { min-width: 60px; }
.button{ max-width: 20px; padding-left: 0px!important; padding-right: 25px!important; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.title{ color: #ff0000; margin-bottom: 1rem; }
.clear{
  border: none; font-size: 8px; cursor: pointer; border-radius: 15px;
  background-color: #1d35d0; color:#ffffff; padding: 6px;
}
.report{ max-width: 50px; }
.report2{ max-width: 100px; }

.total-row > td { position: relative; padding-top: 16px; }
.total-row > td::before {
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #666;
}
.total-row > td:first-child::before { left: 20%; width: 100%; }
.total-row > td:last-child::before { width: 80%; }

.report-table tbody tr { height: 56px; }
.report-table tbody td { vertical-align: middle; }
</style>
