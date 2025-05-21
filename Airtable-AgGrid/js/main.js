let gridApis = {};
let globalSheetData;
let gridApiInstances = [];

async function fetchDeviceDataFromExcel(month_file) {
    console.log("current month show me", month_file)
    const filePath = `excel_data/${month_file}_Excel_Data.xlsx?${new Date().getTime()}`;;
    console.log("current month show me", filePath)
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
  
    const tables = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const columnFields = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const records = jsonData.length > 0 ? jsonData : [];
      return {
        name: sheetName,
        column_fields: columnFields || [],
        data: records
      };
    });
    console.log("tab", tables)
    return { tables };
  }

function getTables(sheetData) {

    globalSheetData = sheetData;
    gridApiInstances.forEach(api => {
      if (api && api.destroy) api.destroy(); // Clean up AG Grid instances
    });
    
    gridApiInstances = [];
    gridApis = {};

    const tabContainer = document.getElementById("tab-container");
    tabContainer.innerHTML = "";

    const tabsWrapper = document.createElement("div");
    tabsWrapper.classList.add("tabs");

    let tableContainer = document.getElementById("myGrid");
    tableContainer.innerHTML = "";

    sheetData.tables.forEach((table, index) => {
        const tab = document.createElement("div");
        tab.classList.add("tab");
        if (index === 0) tab.classList.add("active"); // Set the first tab as active
        tab.setAttribute("data-index", index);

        const tabName = document.createElement("span");
        tabName.classList.add("tab-name");
        tabName.textContent = table.name.replace(/_/g, " "); // Clean the name of underscores
        tab.appendChild(tabName);

        tab.onclick = () => switchTable(index, sheetData);
        tabsWrapper.appendChild(tab);
  

      // Table container
      let tableDiv = document.createElement("div");
      tableDiv.classList.add("table-container");
      if (index === 0) tableDiv.classList.add("active");
      tableDiv.setAttribute("id", `table-${index}`);

      const gridDiv = document.createElement("div");
      gridDiv.setAttribute("id", `grid-${index}`);
      gridDiv.classList.add("ag-theme-alpine");
      gridDiv.classList.add("grid-container");


      tableDiv.appendChild(gridDiv);
      tableContainer.appendChild(tableDiv);

      // Initialize AG Grid only for first tab
      if (index === 0) {
        initAGGrid(index, table);
      }
      });

  tabContainer.innerHTML = "";
  tabContainer.appendChild(tabsWrapper);
}

function switchTable(index) {
  document.querySelectorAll(".tab").forEach((tab, i) => {
    const isActive = i === index;
    tab.classList.toggle("active", isActive);

    const existingIcon = tab.querySelector(".dropdown-icon");
    const existingMenu = tab.querySelector(".dropdown-menu");
    if (isActive) {
      // Show or hide dropdown based on whether it's already there
      if (!existingIcon) {
        const dropdownIcon = document.createElement("i");
        dropdownIcon.classList.add("fas", "fa-chevron-down", "dropdown-icon");
        dropdownIcon.onclick = (event) => toggleDropdown(event, i);
        tab.appendChild(dropdownIcon);
      }

      if (!existingMenu) {
        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu");
        dropdownMenu.setAttribute("id", `dropdown-${i}`);
        dropdownMenu.innerHTML = `
          <div onclick="renameTable(${i})">Rename Table</div>
          <div onclick="downloadTable(${i})">Download File</div>
        `;
        tab.appendChild(dropdownMenu);
      }
    } else {
      // If not active, remove the dropdown menu and icon
      if (existingIcon) existingIcon.remove();
      if (existingMenu) existingMenu.remove();
    }

  });

  document.querySelectorAll(".table-container").forEach((table, i) => {
    table.classList.toggle("active", i === index);
  });

  if (!gridApiInstances[index]) {
    const table = globalSheetData.tables[index];
    initAGGrid(index, table);
  }
}


function initAGGrid(index, table) {
  const columnDefs = table.column_fields.map((field, i) => ({
    headerName: field.replace(/_/g, " "), // Replace underscores with spaces
    field: field,
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    ...(i === 0 && {
      width: 240,
      pinned: "left",
      lockPinned: true,
      cellClass: "lock-pinned",
      cellRenderer: params => {
        const rowIndex = params.node.rowIndex + 1;
        const value = params.data[field];
        return `
          <div class="first-column-cell">
            <span>${rowIndex}</span>
            <span>${value}</span>
          </div>
        `;
      }
    })
  }));

  console.log("columnDefs", columnDefs);

  const gridDiv = document.getElementById(`grid-${index}`);
  const gridApi = agGrid.createGrid(gridDiv, {
    columnDefs: columnDefs,
    rowData: table.data,
    defaultColDef: {
      filter: "agTextColumnFilter",
      floatingFilter: false,
      flex: 1,
      minWidth: 120
    },
    ensureDomOrder: true,
    enableCellTextSelection: true,
    autoGroupColumnDef: {
      minWidth: 200,
      pinned: "left",
    },
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [50, 100, 250, 500, 1000],
  });

  gridApiInstances[index] = gridApi;
}



  function toggleDropdown(event, index) {
    event.stopPropagation();
    let menu = document.getElementById(`dropdown-${index}`);
    let icon = event.currentTarget;

    const isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    icon.classList.toggle("open", !isOpen);
  }





  function toggleDropdown(event, index) {
    event.stopPropagation();
    let menu = document.getElementById(`dropdown-${index}`);
    let icon = event.currentTarget;

    const isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    icon.classList.toggle("open", !isOpen);
  }

  function renameTable(index) {
    let newName = prompt("Enter new table name:");
    if (newName) {
      const tab = document.querySelectorAll(".tab")[index];
      const tabName = tab.querySelector(".tab-name");
      if (tabName) tabName.textContent = newName;
    }
  }


function downloadTable(index) {
  switchTable(index);
  setTimeout(() => {
    onBtnExport(index);
  }, 100);
}

function onBtnExport(index) {
  const api = gridApiInstances[index];
  if (!api) {
    console.error("Grid API not found for table index", index);
    return;
  }

  const sheetName = globalSheetData.tables[index].name || "Sheet";
  const cleanName = sheetName.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${cleanName}-${date}.csv`;

  api.exportDataAsCsv({ fileName });
}


  document.body.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
      menu.style.display = "none";
    });
    document.querySelectorAll(".dropdown-icon").forEach(icon => {
      icon.classList.remove("open");
    });
  });


  function getMonthReportsUpToCurrent() {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIndex = new Date().getMonth(); // 0 = Jan
    const reports = monthNames
      .slice(0, currentMonthIndex + 1)
      .map(month => `${month} Report`);
  
    return {
      reports,
      currentMonth: monthNames[currentMonthIndex]
    };
  }
  
  function populateMonthDropdown() {
    const { reports, currentMonth } = getMonthReportsUpToCurrent();
    const selector = document.getElementById("dataSelector");
  
    selector.innerHTML = ""; // Clear existing options

    reports.forEach(report => {
      const option = document.createElement("option");
      option.value = report;
      option.textContent = report;
      selector.appendChild(option);
  
      // Mark the current month as selected
      if (report.startsWith(currentMonth)) {
        option.selected = true;
      }
    });
  
    return currentMonth; // You can use this to load the default report
  }

  function onDataSelectionChange() {
    const selector = document.getElementById("dataSelector");
    selector.classList.add('focused');
  
    const selectedReport = selector.value;
    const selectedMonth = selectedReport.split(" ")[0]; // "Mar"
  
    fetchDeviceDataFromExcel(selectedMonth)
      .then(sheetData => {
        getTables(sheetData);
        switchTable(0);
      })
      .catch(error => {
        console.error("Error loading selected month Excel data:", error);
      });
    setTimeout(() => {
      selector.classList.remove('focused');
    }, 300);
  }

  function onBtnRefresh() {
    const icon = document.getElementById("refresh-icon");
    icon.classList.add("rotate-animation");
    setTimeout(() => {
      location.reload(); // Reloads the current page
    }, 2000);
  }

  function onDownloadClick() {
    const selector = document.getElementById("dataSelector");
    const selectedReport = selector.value; 
    const selectedMonth = selectedReport.split(" ")[0]; // "Apr"
  
    // Compose file path
    const filePath = `excel_data/${selectedMonth}_Excel_Data.xlsx?${new Date().getTime()}`;
    
    // Trigger download
    const a = document.createElement('a');
    a.href = filePath;
    a.download = `${selectedMonth}_Excel_Data.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  

window.onload = async () => {
    try {
      const currentMonth = populateMonthDropdown();
      console.log("Current Month:", currentMonth);
      const sheetData = await fetchDeviceDataFromExcel(currentMonth);
      console.log("Current  Data:", sheetData);
      getTables(sheetData);
      switchTable(0);
    } catch (error) {
      console.error("Error loading Excel data:", error);
    }
  };

