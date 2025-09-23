<!-- frontend/src/components/erp.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

const API = '' // 同網域可留空，不同網域請填完整網址

// 分頁
const currentPage = ref('one')
const currentPage2 = ref('one-1')
const currentPage3 = ref('one-1')
const currentPage4 = ref('one-1')
const currentPageStock = ref('one-1')

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)

// 清單
const recordList = ref([])
const recordList2 = ref([])
const isLoading = ref(false)

// 品項（動態）
const items = ref([])

const norm = function (v) { return v == null ? '' : String(v).trim() }
const _arr = function (v) { return Array.isArray(v) ? v : (Array.isArray(v && v.items) ? v.items : []) }

const rawItems = computed(function () { return _arr(items.value).filter(function (i) { return i && i.type === 'raw' }) })
const productItems = computed(function () { return _arr(items.value).filter(function (i) { return i && i.type === 'product' }) })

const inOptions  = computed(function () { return rawItems.value.map(function (i) { return i && i.name }).filter(Boolean) })
const outOptions = computed(function () { return rawItems.value.map(function (i) { return i && i.name }).filter(Boolean) })

// 單筆
const inRow  = ref({ item: '', quantity: '', price: '', note: '' })
const outRow = ref({ item: '', quantity: '', note: '' })
const outUnitPrice = ref('')

const editingId = ref(null)
const selectedItem  = ref('')
const selectedItem2 = ref('')

// 共用
const isEmpty = function (v) { return v === '' || v === null || v === undefined }
const isRowCompleteIn = function (row) {
  return !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 && !isEmpty(row.price) && Number(row.price) >= 0
}
const isRowCompleteOut = function (row) {
  return !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0
}

function clearIn () { inRow.value = { item: '', quantity: '', price: '', note: '' } }
function clearOut () { outRow.value = { item: '', quantity: '', note: '' }; outUnitPrice.value = '' }

async function fetchItems () {
  const res = await axios.get(API + '/items')
  items.value = _arr(res && res.data)
}

// 入/出庫讀取
const _arrData = function (data) { return Array.isArray(data) ? data : (Array.isArray(data && data.items) ? data.items : []) }

const fetchRecords = async function () {
  try {
    var url = API + '/records'
    var q = []
    if (selectedDate2.value) q.push('date=' + selectedDate2.value)
    if (selectedItem.value)  q.push('item=' + encodeURIComponent(selectedItem.value))
    if (q.length) url += '?' + q.join('&')
    const res = await axios.get(url)
    recordList.value = _arrData(res && res.data)
  } catch (err) {
    alert('❌ 無法取得入庫資料：' + err.message)
  }
}

const fetchRecords2 = async function () {
  try {
    var url = API + '/outrecords'
    var q = []
    if (selectedDate4.value) q.push('date=' + selectedDate4.value)
    if (q.length) url += '?' + q.join('&')
    const res = await axios.get(url)
    recordList2.value = _arrData(res && res.data)
  } catch (err) {
    alert('❌ 無法取得出庫資料：' + err.message)
  }
}

const fetchRecords3 = async function () {
  try {
    isLoading.value = true
    const list = await Promise.all([
      axios.get(API + '/records'),
      axios.get(API + '/outrecords')
    ])
    recordList.value  = _arrData(list[0] && list[0].data)
    recordList2.value = _arrData(list[1] && list[1].data)
  } catch (err) {
    alert('❌ 取得庫存資料失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// 出庫總覽過濾
const recordList2Filtered = computed(function () {
  const targetRaw = norm(selectedItem2.value)
  const targetDate = norm(selectedDate4.value)
  return recordList2.value.filter(function (r) {
    const dateOk = !targetDate || norm(r && r.date) === targetDate
    const rawOk  = !targetRaw || norm(r && r.item) === targetRaw
    return dateOk && rawOk
  })
})

// 平均成本與庫存彙總
const itemSummary = computed(function () {
  const summary = []
  for (var i = 0; i < inOptions.value.length; i++) {
    const rawName = inOptions.value[i]
    const rawNorm = norm(rawName)

    const inRecords  = recordList.value.filter(function (r) { return norm(r && r.item) === rawNorm })
    const outRecords = recordList2.value.filter(function (r) { return norm(r && r.item) === rawNorm })

    const inQty      = inRecords.reduce(function (s, r) { return s + Number(r && r.quantity || 0) }, 0)
    const inSumPrice = inRecords.reduce(function (s, r) { return s + Number(r && r.price || 0) }, 0)

    const outQty     = outRecords.reduce(function (s, r) { return s + Number(r && r.quantity || 0) }, 0)
    const outSum     = outRecords.reduce(function (s, r) { return s + Number(r && r.price || 0) }, 0)

    const stockQty        = inQty - outQty
    const stockTotalPrice = inSumPrice - outSum
    const avgPrice        = stockQty > 0 ? (stockTotalPrice / stockQty) : 0

    summary.push({ item: rawName, quantity: stockQty, avgPrice: avgPrice, totalPrice: stockTotalPrice })
  }
  return summary
})

const getAvgPrice = function (rawName) {
  const n = norm(rawName)
  const row = itemSummary.value.find(function (i) { return norm(i.item) === n })
  return row ? row.avgPrice : 0
}

function autoFillOutUnitPrice () {
  if (outRow.value.item) outUnitPrice.value = Number(getAvgPrice(outRow.value.item).toFixed(2))
  else outUnitPrice.value = ''
}
watch(function () { return outRow.value.item }, autoFillOutUnitPrice)
watch([recordList, recordList2], autoFillOutUnitPrice, { deep: true })

function checkOutStock () {
  const row = outRow.value
  if (!row.item || !row.quantity) return true

  const rawName = row.item
  const needQty = Number(row.quantity)

  const rawNorm = norm(rawName)
  const inQty = recordList.value
    .filter(function (r) { return norm(r && r.item) === rawNorm })
    .reduce(function (s, r) { return s + Number(r && r.quantity || 0) }, 0)

  const outQty = recordList2.value
    .filter(function (r) { return norm(r && r.item) === rawNorm })
    .reduce(function (s, r) { return s + Number(r && r.quantity || 0) }, 0)

  const left = inQty - outQty
  if (needQty > left + 1e-9) {
    alert('❌【' + rawName + '】庫存不足，需要 ' + needQty.toFixed(2) + 'g，現有 ' + left.toFixed(2) + 'g')
    return false
  }
  return true
}

const submitIn = async function () {
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
    await axios.post(API + '/records', payload)
    alert('✅ 入庫成功')
    await fetchRecords3()
    clearIn()
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

const submitOut = async function () {
  const row = outRow.value
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteOut(row)) { alert('❌ 出庫：品項/數量需填（數量>0）'); return }
  if (!checkOutStock()) return

  try {
    const rawName   = row.item
    const rawQty    = Number(Number(row.quantity).toFixed(2))
    const unit      = Number(getAvgPrice(rawName))
    const lineTotal = Number((unit * rawQty).toFixed(2))

    const payload = { item: rawName, quantity: rawQty, price: lineTotal, note: row.note || '', date: selectedDate3.value }
    await axios.post(API + '/outrecords', payload)
    alert('✅ 出庫成功（已從原料扣庫）')

    await fetchRecords3()
    if (selectedDate5.value !== selectedDate3.value) selectedDate5.value = selectedDate3.value
    await fetchRawCostOfDate()
    await fetchReportOfDate()
    clearOut()
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// 入/出庫編修
const startEditRecord  = function (id) { editingId.value = id }
const startEditRecord2 = function (id) { editingId.value = id }

const confirmEdit = async function () {
  const rec = recordList.value.find(function (r) { return r && r._id === editingId.value })
  try {
    await axios.put(API + '/records/' + editingId.value, rec)
    editingId.value = null
    await fetchRecords()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const confirmEdit2 = async function () {
  const rec = recordList2.value.find(function (r) { return r && r._id === editingId.value })
  try {
    await axios.put(API + '/outrecords/' + editingId.value, rec)
    editingId.value = null
    await fetchRecords2()
    await fetchRawCostOfDate()
    await fetchReportOfDate()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const deleteRecord = async function (id) {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(API + '/records/' + id); await fetchRecords() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}
const deleteRecord2 = async function (id) {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try {
    await axios.delete(API + '/outrecords/' + id)
    await fetchRecords2()
    await fetchRawCostOfDate()
    await fetchReportOfDate()
  } catch (err) {
    alert('❌ 刪除失敗：' + err.message)
  }
}

// 品項設定
const itemEditingId = ref(null)
const newRaw = ref({ name: '' })
const newProduct = ref({ name: '', salePrice: '', consumableCost: '' })

const addRawItem = async function () {
  if (!newRaw.value.name) { alert('請輸入原料名稱'); return }
  try {
    await axios.post(API + '/items', { name: norm(newRaw.value.name), salePrice: 0, type: 'raw', consumableCost: 0 })
    newRaw.value = { name: '' }
    await fetchItems()
  } catch (e) { alert('新增失敗：' + e.message) }
}
const addProductItem = async function () {
  if (!newProduct.value.name) { alert('請輸入成品名稱'); return }
  try {
    await axios.post(API + '/items', {
      name: norm(newProduct.value.name),
      salePrice: Number(newProduct.value.salePrice || 0),
      type: 'product',
      consumableCost: Number(newProduct.value.consumableCost || 0)
    })
    newProduct.value = { name: '', salePrice: '', consumableCost: '' }
    await fetchItems()
  } catch (e) { alert('新增失敗：' + e.message) }
}
const startEditItem = function (id) { itemEditingId.value = id }
const confirmEditItem = async function (it) {
  try {
    const body = {
      name: norm(it.name),
      salePrice: Number(it.salePrice || 0),
      consumableCost: Number(it.consumableCost || 0)
    }
    await axios.put(API + '/items/' + it._id, body)
    itemEditingId.value = null
    await fetchItems()
  } catch (e) { alert('更新失敗：' + e.message) }
}
const deleteItem = async function (id) {
  if (!confirm('確定刪除該品項？')) return
  try { await axios.delete(API + '/items/' + id); await fetchItems() }
  catch (e) { alert('刪除失敗：' + (e && e.message || '')) }
}

// ===== 報表（單表：成品+原料） =====
const reportRawCosts = ref({})
const reportQty = ref({})

// 六費用（新增：人事費、公會費；優待費→請客費）
const stallFee = ref('')
const parkingFee = ref('')
const insuranceFee = ref('')
const treatFee = ref('')       // 請客費（原名：優待費/discountFee）
const personnelFee = ref('')   // 人事費
const guildFee = ref('')       // 公會費

const consumableMap = computed(function () {
  const m = {}
  for (var i = 0; i < productItems.value.length; i++) {
    const it = productItems.value[i]
    m[it.name] = Number(it.consumableCost || 0)
  }
  return m
})

// 後端彙總原料成本
const fetchRawCostOfDate = async function () {
  if (!selectedDate5.value) { reportRawCosts.value = {}; return }
  try {
    const res = await axios.get(API + '/outrecords/total/' + selectedDate5.value)
    reportRawCosts.value = res && res.data && res.data.byRaw || {}
  } catch (e) {
    reportRawCosts.value = {}
  }
}

// 把某日報表套入畫面（含相容欄位）
function applyReportToForm (r) {
  const map = {}
  for (var i = 0; i < productItems.value.length; i++) map[productItems.value[i].name] = ''
  if (r && r.items && Array.isArray(r.items)) {
    for (var j = 0; j < r.items.length; j++) {
      const row = r.items[j]
      const name = String(row && row.item || '')
      if (map.hasOwnProperty(name)) map[name] = Number(row && row.qty || 0)
    }
  }
  reportQty.value = map

  // 相容欄位：fixedExpense/extraExpense、discountFee/preferentialFee → 新欄位
  stallFee.value       = Number((r && (r.stallFee != null ? r.stallFee : r.fixedExpense)) || 0)
  parkingFee.value     = Number((r && r.parkingFee) || 0)
  insuranceFee.value   = Number((r && (r.insuranceFee != null ? r.insuranceFee : r.extraExpense)) || 0)
  treatFee.value       = Number((r && (r.treatFee != null ? r.treatFee : (r.discountFee != null ? r.discountFee : r.preferentialFee))) || 0)
  personnelFee.value   = Number((r && r.personnelFee) || 0)
  guildFee.value       = Number((r && r.guildFee) || 0)
}

const fetchReportOfDate = async function () {
  if (!selectedDate5.value) return
  try {
    const res = await axios.get(API + '/reports/' + selectedDate5.value)
    if (res && res.data) applyReportToForm(res.data)
    else {
      const map = {}
      for (var i = 0; i < productItems.value.length; i++) map[productItems.value[i].name] = ''
      reportQty.value = map
      stallFee.value = parkingFee.value = insuranceFee.value = treatFee.value = personnelFee.value = guildFee.value = ''
    }
  } catch (e) {
    const map = {}
    for (var i = 0; i < productItems.value.length; i++) map[productItems.value[i].name] = ''
    reportQty.value = map
    stallFee.value = parkingFee.value = insuranceFee.value = treatFee.value = personnelFee.value = guildFee.value = ''
  }
}

watch(items, function () {
  const map = Object.assign({}, reportQty.value)
  for (var i = 0; i < productItems.value.length; i++) {
    const it = productItems.value[i]
    if (!map.hasOwnProperty(it.name)) map[it.name] = ''
  }
  Object.keys(map).forEach(function (k) {
    if (!productItems.value.find(function (i) { return i.name === k })) delete map[k]
  })
  reportQty.value = map
}, { deep: true })

const reportTableItems = computed(function () {
  const prods = productItems.value.map(function (p) { return Object.assign({}, p, { _kind: 'product' }) })
  const raws  = rawItems.value.map(function (r) { return Object.assign({}, r, { _kind: 'raw' }) })
  return prods.concat(raws)
})
const isProduct = function (it) { return it && it._kind === 'product' }
const isRaw = function (it) { return it && it._kind === 'raw' }

const perProductRevenue = function (it) {
  const q = Number(reportQty.value[it.name] || 0)
  if (!q) return ''
  return (q * Number(it.salePrice || 0)).toFixed(0)
}

const productRowCost = function (it) {
  const qty = Number(reportQty.value[it.name] || 0)
  if (!qty) return ''
  const extra = qty * Number(consumableMap.value[it.name] || 0)
  return extra.toFixed(2)
}
const rawRowCost = function (rawName) {
  const v = reportRawCosts.value && reportRawCosts.value[rawName]
  return v == null ? '' : Number(v).toFixed(2)
}

const revenueTotal = computed(function () {
  var sum = 0
  for (var i = 0; i < productItems.value.length; i++) {
    const it = productItems.value[i]
    const q = Number(reportQty.value[it.name] || 0)
    sum += q * Number(it.salePrice || 0)
  }
  return sum
})

const baseRawCostTotal = computed(function () {
  return Object.values(reportRawCosts.value || {}).reduce(function (s, v) { return s + Number(v || 0) }, 0)
})
const extraConsumableTotal = computed(function () {
  return productItems.value.reduce(function (s, it) {
    return s + Number(reportQty.value[it.name] || 0) * Number(consumableMap.value[it.name] || 0)
  }, 0)
})
const costTotal = computed(function () { return baseRawCostTotal.value + extraConsumableTotal.value })

const netProfit = computed(function () {
  return revenueTotal.value
    - costTotal.value
    - Number(stallFee.value || 0)
    - Number(parkingFee.value || 0)
    - Number(insuranceFee.value || 0)
    - Number(treatFee.value || 0)
    - Number(personnelFee.value || 0)
    - Number(guildFee.value || 0)
})

const submitReport = async function () {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }

  const unfilled = productItems.value.filter(function (it) { return isEmpty(reportQty.value[it.name]) })
  if (unfilled.length > 0) {
    alert('❌ 以下成品的「份數」尚未填寫（可填 0）：\n' + unfilled.map(function (i) { return '• ' + i.name }).join('\n'))
    return
  }

  // 六費用全部必填（0 可）
  if (
    isEmpty(stallFee.value) || isEmpty(parkingFee.value) || isEmpty(insuranceFee.value) ||
    isEmpty(treatFee.value) || isEmpty(personnelFee.value) || isEmpty(guildFee.value)
  ) {
    alert('❌ 請填寫「攤販費 / 停車費 / 保險費 / 請客費 / 人事費 / 公會費」（可填 0）')
    return
  }

  const payload = {
    date: selectedDate5.value,
    items: productItems.value.map(function (it) { return { item: it.name, qty: Number(reportQty.value[it.name] || 0) } }),
    stallFee: Number(stallFee.value || 0),
    parkingFee: Number(parkingFee.value || 0),
    insuranceFee: Number(insuranceFee.value || 0),
    treatFee: Number(treatFee.value || 0),
    personnelFee: Number(personnelFee.value || 0),
    guildFee: Number(guildFee.value || 0),
    // 相容舊命名（後端可忽略）
    discountFee: Number(treatFee.value || 0),
    preferentialFee: Number(treatFee.value || 0),
    netProfit: Number(netProfit.value || 0)
  }
  try {
    await axios.post(API + '/reports', payload)
    alert('✅ 報表已送出')
    await fetchReportsList()
  } catch (err) {
    alert('❌ 報表傳送失敗：' + err.message)
  }
}

// 報表總覽
const reportList = ref([])
const isReportsLoading = ref(false)
async function fetchReportsList () {
  try {
    isReportsLoading.value = true
    const res = await axios.get(API + '/reports')
    const arr = _arr(res && res.data) || []
    reportList.value = arr.sort(function (a, b) { return (b && b.date || '').localeCompare(a && a.date || '') })
  } finally { isReportsLoading.value = false }
}
const deleteReportByDate = async function (dateStr) {
  if (!dateStr) return
  if (!confirm('❌ 確定要清除 ' + dateStr + ' 的報表資料嗎？')) return
  try {
    await axios.delete(API + '/reports/' + encodeURIComponent(dateStr))
    alert('✅ 已清除該日報表資料')
    await fetchReportsList()
  } catch (e) { alert('❌ 清除失敗：' + (e && e.message || '')) }
}

onMounted(async function () {
  await fetchItems()
  if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
  else if (currentPage.value === 'four') { await fetchReportsList(); await fetchRawCostOfDate(); await fetchReportOfDate() }
  else { await fetchRecords() }
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedItem, selectedItem2, currentPage, currentPageStock],
  async function () {
    if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
    else if (currentPage.value === 'four') { await fetchRawCostOfDate(); await fetchReportOfDate() }
    else { await fetchRecords() }
  },
  { immediate: false }
)

watch(currentPage4, async function (p) {
  if (currentPage.value === 'four' && p === 'two-2') await fetchReportsList()
})
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }"   @click="function(){ currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }"   @click="function(){ currentPage = 'two'; currentPageStock = 'one-1' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="function(){ currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }"  @click="function(){ currentPage = 'four'; currentPage4 = 'one-1'; fetchReportsList(); fetchRawCostOfDate(); fetchReportOfDate() }">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫 -->
    <div v-if="currentPage === 'one'">
      <div v-if="currentPage2 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'two-2' }" @click="function(){ currentPage2 = 'two-2'; fetchRecords() }">入庫總覽</button>
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
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'one-1' }" @click="function(){ currentPage2 = 'one-1' }">新增入庫</button>
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
            <thead><tr><th></th><th>品項</th><th>數量(g)</th><th>整筆價格</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
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
      <div class="d-flex justify-content-center align-items-center">
        <button
          v-if="currentPageStock === 'one-1'"
          style="min-width: 330px;"
          class="btn mb-3"
          :class="{ active: currentPageStock === 'two-2' }"
          @click="function(){ currentPageStock = 'two-2'; fetchItems() }"
        >品項設定</button>
        <button
          v-else
          style="min-width: 330px;"
          class="btn mb-3"
          :class="{ active: currentPageStock === 'one-1' }"
          @click="function(){ currentPageStock = 'one-1'; fetchRecords3() }"
        >庫存總覽</button>
      </div>

      <!-- 庫存總覽 -->
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

      <!-- 品項設定 -->
      <div v-else-if="currentPageStock === 'two-2'" class="form-wrapper">
        <h5 class="title">品項設定</h5>

        <!-- 原料 -->
        <h6 class="text-start mb-2">原料</h6>
        <table class="table">
          <thead><tr><th>品項名稱</th><th style="width:120px;"></th></tr></thead>
          <tbody>
            <tr v-for="it in rawItems" :key="it._id">
              <td>
                <template v-if="itemEditingId === it._id"><input v-model="it.name" /></template>
                <template v-else>{{ it.name }}</template>
              </td>
              <td class="text-center">
                <template v-if="itemEditingId === it._id">
                  <button class="update-btn" @click="confirmEditItem(it)">存</button>
                </template>
                <template v-else>
                  <button class="update-btn" @click="startEditItem(it._id)">改</button>
                  <button class="delete-btn ms-2" @click="deleteItem(it._id)">刪</button>
                </template>
              </td>
            </tr>
            <tr>
              <td><input placeholder="新原料名稱" v-model="newRaw.name" /></td>
              <td class="text-center"><button class="update-btn" @click="addRawItem">新增</button></td>
            </tr>
          </tbody>
        </table>

        <!-- 成品 -->
        <h6 class="text-start mb-2 mt-4">成品</h6>
        <table class="table product-table">
          <thead>
            <tr>
              <th>成品名稱</th>
              <th>售價</th>
              <th>耗材</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in productItems" :key="it._id">
              <td>
                <template v-if="itemEditingId === it._id"><input v-model="it.name" /></template>
                <template v-else>{{ it.name }}</template>
              </td>
              <td style="max-width:120px;">
                <template v-if="itemEditingId === it._id"><input type="number" step="0.01" min="0" v-model.number="it.salePrice" /></template>
                <template v-else>{{ Number(it.salePrice || 0).toFixed(2) }}</template>
              </td>
              <td style="max-width:120px;">
                <template v-if="itemEditingId === it._id"><input type="number" step="0.01" min="0" v-model.number="it.consumableCost" /></template>
                <template v-else>{{ Number(it.consumableCost || 0).toFixed(2) }}</template>
              </td>
              <td class="text-center">
                <template v-if="itemEditingId === it._id">
                  <button class="update-btn" @click="confirmEditItem(it)">存</button>
                  <button class="delete-btn ms-2" @click="deleteItem(it._id)">刪</button>
                </template>
                <template v-else>
                  <button class="update-btn" @click="startEditItem(it._id)">改</button>
                  <button class="delete-btn ms-2" @click="deleteItem(it._id)">刪</button>
                </template>
              </td>
            </tr>
            <tr>
              <td><input placeholder="新成品名稱" v-model="newProduct.name" /></td>
              <td><input type="number" step="0.01" min="0" placeholder="售價" v-model.number="newProduct.salePrice" /></td>
              <td><input type="number" step="0.01" min="0" placeholder="耗材" v-model.number="newProduct.consumableCost" /></td>
              <td class="text-center"><button class="update-btn" @click="addProductItem">新增</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 出庫 -->
    <div v-if="currentPage === 'three'">
      <div v-if="currentPage3 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'two-2' }" @click="function(){ currentPage3 = 'two-2'; fetchRecords2() }">出庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">商品出庫</h5>
          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate3" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>原料</th><th>數量(g)</th><th>平均單價</th><th>備註</th></tr></thead>
            <tbody>
              <tr>
                <td><div type="button" class="clear" @click="clearOut">空</div></td>
                <td class="items">
                  <select v-model="outRow.item">
                    <option v-for="option in outOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="outRow.quantity" min="0.01" step="0.01" /></td>
                <td><input type="number" class="price" :value="outUnitPrice" disabled /></td>
                <td><input class="note" v-model="outRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end"><button class="btn text-center ms-2" @click="submitOut">送出</button></div>
        </div>
      </div>

      <!-- 出庫總覽 -->
      <div v-else-if="currentPage3 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'one-1' }" @click="function(){ currentPage3 = 'one-1' }">新增出庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">出庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate4" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center mb-3 gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">原料&ensp;:</div>
              <select v-model="selectedItem2" style="min-height:42px;font-size:14px;flex:1;">
                <option value=""></option>
                <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>原料</th><th>數量(g)</th><th>整筆價格</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
            <tbody>
              <tr v-for="record in recordList2Filtered" :key="record._id">
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
      <div v-if="currentPage4 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'two-2' }" @click="function(){ currentPage4 = 'two-2'; fetchReportsList() }">報表總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表紀錄</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input
                type="date"
                v-model="selectedDate5"
                class="form-control"
                style="min-height:42px;flex:1;"
                @change="function(){ fetchRawCostOfDate(); fetchReportOfDate() }"
              />
            </div>
          </div>

          <!-- 單表 -->
          <table class="text-center align-middle">
            <thead><tr><th>品項</th><th>份數 × 售價</th><th>營業收入</th><th>銷貨成本</th></tr></thead>
            <tbody>
              <tr v-for="it in reportTableItems" :key="(it._id || it.name) + (it._kind || '')">
                <td>{{ it.name }}</td>

                <td class="d-flex justify-content-center align-items-center gap-2">
                  <template v-if="isProduct(it)">
                    <input v-model.number="reportQty[it.name]" type="number" min="0" step="1" class="form-control text-center report" style="display:inline-block;" />
                    <span>× {{ Number(it.salePrice || 0).toFixed(0) }}</span>
                  </template>
                </td>

                <td>
                  <template v-if="isProduct(it)">{{ perProductRevenue(it) }}</template>
                </td>

                <td>
                  <template v-if="isRaw(it)">{{ rawRowCost(it.name) }}</template>
                  <template v-else>{{ productRowCost(it) }}</template>
                </td>
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

          <!-- 六格費用 -->
          <div class="fees-grid mt-3">
            <div class="fee">
              <label>攤販費：</label>
              <input v-model.number="stallFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
            <div class="fee">
              <label>停車費：</label>
              <input v-model.number="parkingFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
            <div class="fee">
              <label>保險費：</label>
              <input v-model.number="insuranceFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
            <div class="fee">
              <label>請客費：</label>
              <input v-model.number="treatFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
            <div class="fee">
              <label>人事費：</label>
              <input v-model.number="personnelFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
            <div class="fee">
              <label>公會費：</label>
              <input v-model.number="guildFee" type="number" min="0" step="1" class="form-control text-center report2" />
            </div>
          </div>

          <div class="d-flex justify-content-center align-items-center gap-3 mt-3">
            <div class="fw-bold">淨利：</div>
            <div>{{ netProfit.toFixed(2) }}</div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <button class="btn" style="min-width:200px;" @click="submitReport">送出報表</button>
          </div>
        </div>
      </div>

      <!-- 報表總覽 -->
      <div v-else-if="currentPage4 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'one-1' }" @click="function(){ currentPage4 = 'one-1' }">報表紀錄</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表總覽</h5>

          <div v-if="isReportsLoading" style="font-size:14px;color:#888;">載入中...</div>
          <div v-else>
            <div v-if="reportList.length > 0" style="font-size:14px;">
              <table class="table report-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>總營收</th>
                    <th>總成本</th>
                    <th>淨利</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in reportList" :key="r._id || r.date">
                    <td>{{ r.date }}</td>
                    <td>{{ Number(r.revenueOfDay || 0).toFixed(0) }}</td>
                    <td>{{ Number(r.costOfDay || 0).toFixed(2) }}</td>
                    <td>{{ r && r.netProfit == null ? '' : Number(r.netProfit).toFixed(2) }}</td>
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
.item { background-color:#b2afaf; width:50%; cursor:pointer; transition:background-color .2s; box-shadow:2px 2px 8px rgba(0,0,0,.2); }
.item.active { background-color:#6c6d6e; color:#fff; }
.page-content { padding:20px; min-height:200px; text-align:center; font-size:1.2rem; }
input[type="date"] { padding:8px 24px; font-size:1rem; border:1px solid #ccc; border-radius:4px; width:50%; }
.btn { background-color:#b2afaf; padding:10px; border-radius:4px; cursor:pointer; transition:background-color .2s; font-size:12px; width:20%; white-space:nowrap; }
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

input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }

.title{ color:#f00; margin-bottom:1rem; }
.clear{ border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
.report{ max-width:70px; }
.report2{ max-width:120px; }

/* 報表合計分隔線 */
.total-row > td { position:relative; padding-top:16px; }
.total-row > td::before { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:#666; }
.total-row > td:first-child::before { left:20%; width:100%; }
.total-row > td:last-child::before { width:80%; }

.report-table tbody tr { height:56px; }
.report-table tbody td { vertical-align:middle; }

/* 成品表格固定欄寬 */
.product-table { table-layout: fixed; }
.product-table th, .product-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-table th:nth-child(1), .product-table td:nth-child(1) { width: 70px; }
.product-table th:nth-child(2), .product-table td:nth-child(2) { width: 60px; }
.product-table th:nth-child(3), .product-table td:nth-child(3) { width: 60px; }
.product-table th:nth-child(4), .product-table td:nth-child(4) { width: 60px; }

/* 六格費用：2 欄 x 3 列 */
.fees-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 360px;
  margin: 0 auto;
}
.fee {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.fee label {
  font-size: 14px;
  white-space: nowrap;
}
</style>
