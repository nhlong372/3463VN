let currentMode = "NEW";

// DOM Elements
const tableHeader = document.getElementById("tableHeader");
const tableBody = document.getElementById("tableBody");
const searchNameInput = document.getElementById("searchName");
const searchPlateInput = document.getElementById("searchPlate");
const filterTypeSelect = document.getElementById("filterType");
const rowCountDiv = document.getElementById("rowCount");
const lblSearchName = document.getElementById("lblSearchName");

function removeVietnameseTones(str) {
  if (!str) return "";
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|ã|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Y|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase().trim();
}

// THUẬT TOÁN TỰ ĐỘNG NHÓM DÃY SỐ (TỪ 3 SỐ TRỞ LÊN MỚI GỘP)
function gopBienSoTheoDay(mangBienSo) {
  if (!mangBienSo || mangBienSo.length === 0) return [];
  let numbers = mangBienSo.map(Number).sort((a, b) => a - b);
  let ketQua = [];
  let start = numbers[0];
  let prev = numbers[0];

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === prev + 1) {
      prev = numbers[i];
    } else {
      if (prev - start >= 2) {
        ketQua.push(`${start}-${prev}`);
      } else if (prev - start === 1) {
        ketQua.push(start.toString(), prev.toString());
      } else {
        ketQua.push(start.toString());
      }
      start = numbers[i];
      prev = numbers[i];
    }
  }
  if (prev - start >= 2) {
    ketQua.push(`${start}-${prev}`);
  } else if (prev - start === 1) {
    ketQua.push(start.toString(), prev.toString());
  } else {
    ketQua.push(start.toString());
  }
  return ketQua;
}

// RÃ DỮ LIỆU 63 TỈNH GỐC
function buildDanhSach63TinhCu() {
  let list = [];
  dbTinhThanh.forEach((tinhMoi) => {
    tinhMoi.tinhCu.forEach((tc) => {
      list.push({
        stt: "",
        tenCu: tc.ten,
        thuocTinhMoi: tinhMoi.tenMoi,
        isTrungUongGoc: tc.isTrungUongCu,
        bienSoGoc: tc.bsg,
      });
    });
  });

  return list
    .sort((a, b) => a.tenCu.localeCompare(b.tenCu, "vi"))
    .map((item, idx) => {
      item.stt = (idx + 1).toString().padStart(2, "0");
      return item;
    });
}

const db63TinhCu = buildDanhSach63TinhCu();

// ĐỔI CÁC CHẾ ĐỘ TAB (Giữ nguyên hiển thị dropdown bộ lọc)
function switchMode(mode) {
  currentMode = mode;
  searchNameInput.value = "";
  searchPlateInput.value = "";
  filterTypeSelect.value = "all"; // Reset bộ lọc về tất cả khi đổi tab

  if (mode === "NEW") {
    document.getElementById("tabNew").classList.add("active");
    document.getElementById("tabOld").classList.remove("active");
    lblSearchName.innerText = "Tìm kiếm tên tỉnh/thành phố (Mới hoặc Cũ):";
  } else {
    document.getElementById("tabNew").classList.remove("active");
    document.getElementById("tabOld").classList.add("active");
    lblSearchName.innerText = "Tìm kiếm tên tỉnh/thành phố trước đây:";
  }
  filterData();
}

// LOGIC LỌC DỮ LIỆU ĐA NĂNG CHO CẢ 2 TAB
function filterData() {
  const nameQuery = removeVietnameseTones(searchNameInput.value);
  const plateQuery = searchPlateInput.value.trim();
  const typeFilter = filterTypeSelect.value;
  tableBody.innerHTML = "";

  // Tạo Regex để kiểm tra từ khóa nằm ở đầu của một từ (ví dụ: "hai" khớp "hai phong", không khớp "thai")
  // Khử các ký tự đặc biệt nếu có để tránh lỗi Regex
  const safeQuery = nameQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const nameRegex =
    nameQuery !== "" ? new RegExp("\\b" + safeQuery, "i") : null;

  if (currentMode === "NEW") {
    // --- XỬ LÝ CHO TAB 34 TỈNH MỚI ---
    tableHeader.innerHTML = `
                <tr>
                    <th class="col-stt" style="width: 60px; text-align: center;">STT</th>
                    <th class="col-name" style="width: 250px;">Tên Tỉnh/Thành Mới</th>
                    <th class="col-type" style="width: 150px;">Phân Loại</th>
                    <th class="col-map">Sáp Nhập Từ Các Tỉnh/Thành</th>
                    <th class="col-plate" style="width: 250px;">Kí Hiệu Biển Số Xe</th>
                </tr>
            `;

    const filtered = dbTinhThanh.filter((item) => {
      if (typeFilter === "tw" && !item.isTrungUong) return false;
      if (typeFilter === "tinh" && item.isTrungUong) return false;

      const tatCaBienTrongCum = item.tinhCu.flatMap((tc) => tc.bsg);
      if (
        plateQuery !== "" &&
        !tatCaBienTrongCum.some((bs) => bs.includes(plateQuery))
      )
        return false;

      if (nameRegex) {
        const matchMoi = nameRegex.test(removeVietnameseTones(item.tenMoi));
        const matchCu = item.tinhCu.some((tc) =>
          nameRegex.test(removeVietnameseTones(tc.ten)),
        );
        if (!matchMoi && !matchCu) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="no-result">Không tìm thấy kết quả!</td></tr>`;
    } else {
      filtered.forEach((item) => {
        let tinhCuTags = "";
        // Nếu chỉ có 1 tỉnh cũ và tên tỉnh cũ đó trùng hoàn toàn với tên tỉnh mới
        if (item.tinhCu.length === 1 && item.tinhCu[0].ten === item.tenMoi) {
          tinhCuTags = `<span class="tag-tinh-cu" style="color: #a0aec0; font-style: italic;">Giữ Nguyên</span>`;
        } else {
          // Nếu là cụm sáp nhập nhiều tỉnh (hoặc đổi tên), hiển thị danh sách các tag cũ bình thường
          tinhCuTags = item.tinhCu
            .map((tc) => `<span class="tag-tinh-cu">${tc.ten}</span>`)
            .join("");
        }
        let tinhCuSubTags = "";
        if (item.tinhCu.length === 1 && item.tinhCu[0].ten === item.tenMoi) {
          tinhCuSubTags = `Giữ Nguyên`;
        } else {
          // Nếu là cụm sáp nhập nhiều tỉnh (hoặc đổi tên), hiển thị danh sách các tag cũ bình thường
          tinhCuSubTags = item.tinhCu
            .map((tc) => `${tc.ten},`)
            .join("");
        }
        const tatCaBienTrongCum = item.tinhCu.flatMap((tc) => tc.bsg);
        const bienSoDaGop = gopBienSoTheoDay(tatCaBienTrongCum);
        const bienSoTags = bienSoDaGop.map(bs => `<span class="tag-bien-so">${bs}</span>`).join(' ');
        const loaiHinh = item.isTrungUong ? `<span class="badge-tw">Trực thuộc TW</span>` : `<span class="badge-tinh">Tỉnh</span>`;

        tableBody.innerHTML += `
                        <tr>
                            <td class="col-stt" style="text-align: center; font-weight: bold; color: #888;">${item.stt}</td>
                            <td class="col-name" data-label="Tên Tỉnh/Thành Mới:" style="font-weight: bold; color: #ff0000;">${item.tenMoi} (<span class="sub-tag-tinh-cu">${tinhCuSubTags}</span>)</td>
                            <td class="col-type" data-label="Phân Loại">${loaiHinh}</td>
                            <td class="col-map" data-label="Sáp Nhập Từ Các Tỉnh/Thành:">${tinhCuTags}</td>
                            <td class="col-plate" data-label="Biển Số Xe:">${bienSoTags}</td>
                        </tr>
                    `;
      });
    }
    rowCountDiv.innerText = `Hiển thị: ${filtered.length} / ${dbTinhThanh.length} địa phương mới`;
  } else {
    // --- XỬ LÝ CHO TAB 63 TỈNH CŨ ---
    tableHeader.innerHTML = `
                <tr>
                    <th class="col-stt" style="width: 60px; text-align: center;">STT</th>
                    <th class="col-name" style="width: 250px;">Tên Tỉnh/Thành Cũ</th>
                    <th class="col-type" style="width: 150px;">Phân Loại</th>
                    <th class="col-map" style="width: 300px;">Nay Sáp Nhập Với</th>
                    <th class="col-plate">Kí Hiệu Biển Số Xe</th>
                </tr>
            `;

    const filtered = db63TinhCu.filter((item) => {
      if (typeFilter === "tw" && !item.isTrungUongGoc) return false;
      if (typeFilter === "tinh" && item.isTrungUongGoc) return false;
      if (
        plateQuery !== "" &&
        !item.bienSoGoc.some((bs) => bs.includes(plateQuery))
      )
        return false;
      if (nameRegex) {
        const matchTenTinhCu = nameRegex.test(
          removeVietnameseTones(item.tenCu),
        );
        if (!matchTenTinhCu) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="no-result">Không tìm thấy kết quả phù hợp!</td></tr>`;
    } else {
      filtered.forEach((item) => {
        const bienSoDaGop = gopBienSoTheoDay(item.bienSoGoc);
        const bienSoTags = bienSoDaGop.map(bs => `<span class="tag-bien-so">${bs}</span>`).join(' ');
        const loaiHinhGoc = item.isTrungUongGoc ? `<span class="badge-tw">Trực thuộc TW</span>` : `<span class="badge-tinh">Tỉnh</span>`;
        let hienThiThuocVe = "";
        if (
          item.tenCu === item.thuocTinhMoi ||
          item.thuocTinhMoi.includes(item.tenCu)
        ) {
          // Nếu giữ nguyên, hiển thị dấu gạch ngang mờ hoặc chữ "Giữ nguyên" tùy bạn chọn
          hienThiThuocVe = `<span style="color: #0d47a1; font-style: italic;"> Giữ nguyên</span>`;
        } else {
          // Nếu có sự thay đổi sáp nhập thực sự, giữ nguyên tag màu xanh
          hienThiThuocVe = `${item.thuocTinhMoi}`;
        }
        tableBody.innerHTML += `
                        <tr>
                            <td class="col-stt" style="text-align: center; font-weight: bold; color: #888;">${item.stt}</td>
                            <td class="col-name" data-label="Tên Tỉnh/Thành Cũ:" style="font-weight: bold; color: #01579b;">${item.tenCu}</td>
                            <td class="col-type" data-label="Phân Loại:">${loaiHinhGoc}</td>
                            <td class="col-map" data-label="Nay Sáp Nhập Với:"><span class="tag-tinh-moi">${hienThiThuocVe}</span></td>
                            <td class="col-plate" data-label="Kí Hiệu Biển Số Xe:">${bienSoTags}</td>
                        </tr>
                    `;
      });
    }
    rowCountDiv.innerText = `Hiển thị: ${filtered.length} / 63 tỉnh thành trước đây`;
  }
}

// Đăng ký lắng nghe sự kiện thay đổi đầu vào để tự động lọc
searchNameInput.addEventListener("input", filterData);
searchPlateInput.addEventListener("input", filterData);
filterTypeSelect.addEventListener("change", filterData);

// Chạy render mặc định khi mở trang
switchMode("NEW");

// Không cho nhập ký tự chữ và ký tự đặc biệt vào ô biển số xe
var inputBox = document.getElementById("searchPlate");
inputBox.addEventListener("keydown", function (e) {
  // 1. Cho phép các phím điều hướng và xóa hoạt động bình thường
  var allowableKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
  if (allowableKeys.includes(e.key)) {
    return; // Thoát hàm, cho phép thực hiện
  }

  // 2. Kiểm tra nếu phím nhấn vào KHÔNG PHẢI là số từ 0-9 thì chặn lại
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault();
  }
});

// Không cho nhập ký tự số và ký tự đặc biệt vào ô tỉnh/thành phố
var inputBox = document.getElementById("searchName");

inputBox.addEventListener("keydown", function (e) {
  // 1. Cho phép các phím chức năng/điều hướng hoạt động bình thường
  var allowableKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", " "]; // " " là phím khoảng trắng
  if (allowableKeys.includes(e.key)) {
    return; // Cho phép thực hiện, thoát khỏi hàm
  }

  // 2. Kiểm tra nếu phím vừa bấm KHÔNG PHẢI là chữ cái (bao gồm cả chữ có dấu tiếng Việt)
  if (!/[a-zA-ZÀ-ỹ]/.test(e.key)) {
    e.preventDefault(); // Chặn lại, không cho hiển thị ký tự đó
  }
});