
var app = angular.module("expenseApp", []);

app.controller("ExpenseController", function($scope) {

    // LOGIN
    $scope.isLoggedIn = false;

    $scope.loginData = {
        username: "",
        password: ""
    };

    $scope.login = function() {

        if ($scope.loginData.username &&
            $scope.loginData.password) {

            $scope.isLoggedIn = true;

            showMessage("Login successful!");

        }

    };

    $scope.logout = function() {

        $scope.isLoggedIn = false;

        $scope.loginData = {
            username: "",
            password: ""
        };

    };


    // INITIAL DATA
    $scope.groupName = "";
    $scope.members = [];
    $scope.expenses = [];

    $scope.totalExpenses = 0;
    $scope.paidAmount = 0;
    $scope.pendingAmount = 0;

    $scope.paidPercentage = 0;
    $scope.pendingPercentage = 0;

    $scope.memberSummary = [];
    $scope.unpaidPayments = [];

    $scope.groupData = {};
    $scope.expense = {};


    // LOAD SAVED DATA
    function loadData() {

        try {

            var savedData = localStorage.getItem(
                "groupExpenseData"
            );

            if (savedData) {

                var data = JSON.parse(savedData);

                $scope.groupName = data.groupName || "";
                $scope.members = data.members || [];
                $scope.expenses = data.expenses || [];

            }

        } catch (error) {

            console.error("Unable to load saved data", error);

        }

    }


    // SAVE DATA
    function saveData() {

        var data = {

            groupName: $scope.groupName,
            members: $scope.members,
            expenses: $scope.expenses

        };

        localStorage.setItem(
            "groupExpenseData",
            JSON.stringify(data)
        );

    }


    // JQUERY TOAST NOTIFICATION
    function showMessage(message) {

        $("#toast")
            .stop(true, true)
            .text(message)
            .fadeIn(300)
            .delay(2500)
            .fadeOut(500);

    }


    // CREATE GROUP
    $scope.createGroup = function() {

        var groupName = ($scope.groupData.name || "").trim();

        var count = Number($scope.groupData.memberCount);

        var names = ($scope.groupData.memberNames || "")
            .split(",")
            .map(function(name) {
                return name.trim();
            })
            .filter(function(name) {
                return name.length > 0;
            });

        var uniqueNames = names.filter(function(name, index) {
            return names.findIndex(function(item) {
                return item.toLowerCase() === name.toLowerCase();
            }) === index;
        });

        if (!groupName) {

            showMessage("Please enter a group name!");
            return;

        }

        if (!count || count < 2 || count > 10) {

            showMessage("Please select number of members!");
            return;

        }

        if (uniqueNames.length !== count ||
            names.length !== count) {

            showMessage(
                "Please enter exactly " + count +
                " different member names!"
            );

            return;

        }

        // Reset previous group expenses
        $scope.groupName = groupName;

        $scope.members = uniqueNames;

        $scope.expenses = [];

        $scope.groupData = {};

        calculateAll();

        saveData();

        showMessage("Group created successfully!");

    };


    // ADD EXPENSE
    $scope.addExpense = function() {

        if ($scope.members.length < 2) {

            showMessage("Please create a group first!");
            return;

        }

        var name = ($scope.expense.name || "").trim();

        var amount = Number($scope.expense.amount);

        var paidBy = $scope.expense.paidBy;

        if (!name || !Number.isFinite(amount) || amount <= 0) {

            showMessage("Please enter valid expense details!");
            return;

        }

        if (!$scope.members.includes(paidBy)) {

            showMessage("Please select a valid payer!");
            return;

        }

        // Equal share calculation
        var share = amount / $scope.members.length;

        // Create individual payment records
        var payments = $scope.members.map(function(member) {

            return {

                member: member,

                amount: share,

                // Payer's own share is considered paid.
                paid: member === paidBy,

                paidAt: member === paidBy
                    ? new Date().toLocaleString()
                    : null

            };

        });

        var newExpense = {

            id: Date.now(),

            name: name,

            amount: amount,

            paidBy: paidBy,

            share: share,

            date: new Date().toLocaleDateString(),

            payments: payments

        };

        // Add expense
        $scope.expenses.push(newExpense);

        // Clear form
        $scope.expense = {};

        // Update calculations
        calculateAll();

        saveData();

        showMessage("Expense added successfully!");

    };


    // CALCULATE ALL DASHBOARD VALUES
    function calculateAll() {

        $scope.totalExpenses = 0;

        $scope.paidAmount = 0;

        $scope.pendingAmount = 0;

        $scope.memberSummary = [];

        $scope.unpaidPayments = [];


        // Create initial member summary
        $scope.members.forEach(function(member) {

            $scope.memberSummary.push({

                name: member,

                totalShare: 0,

                paid: 0,

                pending: 0,

                pendingPercentage: 0

            });

        });


        // Process each expense
        $scope.expenses.forEach(function(expense) {

            $scope.totalExpenses += expense.amount;

            expense.paidCount = 0;

            expense.pendingCount = 0;


            expense.payments.forEach(function(payment) {

                var member = $scope.memberSummary.find(
                    function(item) {

                        return item.name === payment.member;

                    }
                );

                if (!member) {
                    return;
                }

                member.totalShare += payment.amount;


                if (payment.paid) {

                    member.paid += payment.amount;

                    $scope.paidAmount += payment.amount;

                    expense.paidCount++;

                } else {

                    member.pending += payment.amount;

                    $scope.pendingAmount += payment.amount;

                    expense.pendingCount++;


                    // Unpaid notification details
                    $scope.unpaidPayments.push({

                        expenseId: expense.id,

                        expenseName: expense.name,

                        member: payment.member,

                        amount: payment.amount

                    });

                }

            });

        });


        // Calculate percentages
        var total = $scope.paidAmount +
                    $scope.pendingAmount;

        if (total > 0) {

            $scope.paidPercentage =
                ($scope.paidAmount / total) * 100;

            $scope.pendingPercentage =
                ($scope.pendingAmount / total) * 100;

        } else {

            $scope.paidPercentage = 0;

            $scope.pendingPercentage = 0;

        }


        // Member-wise graph percentage
        $scope.memberSummary.forEach(function(member) {

            if (member.totalShare > 0) {

                member.pendingPercentage =
                    (member.pending / member.totalShare) * 100;

            }

        });

    }


    // MARK PAYMENT AS PAID
    $scope.markAsPaid = function(expenseId, memberName) {

        var expense = $scope.expenses.find(function(item) {

            return item.id === expenseId;

        });

        if (!expense) {
            return;
        }

        var payment = expense.payments.find(function(item) {

            return item.member === memberName;

        });

        if (payment && !payment.paid) {

            payment.paid = true;

            payment.paidAt = new Date().toLocaleString();

            calculateAll();

            saveData();

            showMessage(
                memberName + " payment marked as paid!"
            );

        }

    };


    // INITIALIZE APPLICATION
    loadData();

    calculateAll();


});
